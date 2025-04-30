import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropletIcon,
  Loader2Icon,
  ThermometerIcon,
  Zap,
  SunIcon,
  MoonIcon,
  Fish,
} from "lucide-react";

// Define types
interface EspVals {
  temp: number;
  light: boolean;
  dist: number;
  turb: number;
}

interface DataEntry {
  timestamp: number;
  value: EspVals;
}

interface ChartData {
  time: string;
  temperature: number;
  turbidity: number;
  distance: number;
  light: number;
}

export default function Home() {
  // State
  const [data, setData] = useState<Record<string, EspVals>>({});
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lightStatus, setLightStatus] = useState<boolean>(false);
  const [feedStatus, setFeedStatus] = useState<boolean>(false);
  const [feedCooldown, setFeedCooldown] = useState<boolean>(false);

  // Current values
  const current = {
    temp: 0,
    light: false,
    dist: 0,
    turb: 0,
  };

  // Set current values from the latest data entry
  if (Object.keys(data).length > 0) {
    const latestTimestamp = Math.max(...Object.keys(data).map(Number));
    current.temp = data[latestTimestamp].temp;
    current.light = data[latestTimestamp].light;
    current.dist = data[latestTimestamp].dist;
    current.turb = data[latestTimestamp].turb;
  }

  // Fetch data from the API
  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/data");
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const jsonData = await response.json();
      setData(jsonData);

      // Process data for charts
      const processedData: ChartData[] = Object.entries(jsonData)
        .map((a,b) => {
          return {
            time: new Date(Number(a[0])).toLocaleTimeString(),
            temperature: (a[1] as EspVals).temp,
            turbidity: (a[1] as EspVals).turb,
            distance: (a[1] as EspVals).dist,
            light: (a[1] as EspVals).light ? 0 : 100, // Convert boolean to numeric value for chart
          };
        })
        .sort((a, b) => {
          return new Date(a.time).getTime() - new Date(b.time).getTime();
        })
        .slice(-20); // Show only the last 20 data points

      setChartData(processedData);
      setLoading(false);
    } catch (err) {
      setError("Error fetching data");
      setLoading(false);
      console.error(err);
    }
  };

  // Send command to the API
  const sendCommand = async (command: string) => {
    try {
      const response = await fetch("http://localhost:8080/api/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error("Failed to send command");
      }

      if (command === "light on") {
        setLightStatus(true);
      } else if (command === "light off") {
        setLightStatus(false);
      } else if (command === "feed") {
        setFeedStatus(true);
        setFeedCooldown(true);

        // Reset feed status after 3 seconds
        setTimeout(() => {
          setFeedStatus(false);
        }, 3000);

        // Reset cooldown after 60 seconds
        setTimeout(() => {
          setFeedCooldown(false);
        }, 60000);
      }
    } catch (err) {
      setError("Error sending command");
      console.error(err);
    }
  };

  // Toggle light
  const toggleLight = () => {
    const command = lightStatus ? "light off" : "light on";
    sendCommand(command);
  };

  // Trigger feed
  const triggerFeed = () => {
    if (!feedCooldown) {
      sendCommand("feed");
    }
  };

  // Fetch data on component mount and set polling interval
  useEffect(() => {
    fetchData();

    // Polling interval
    const interval = setInterval(() => {
      fetchData();
    }, 10000); // Fetch data every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Temperature gauge color based on value
  const getTempColor = (temp: number) => {
    if (temp < 24) return "text-blue-500";
    if (temp > 28) return "text-red-500";
    return "text-green-500";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Aquarium Monitoring Dashboard
        </h1>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2Icon className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Current Values Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Temperature Card */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <ThermometerIcon className="mr-2" />
                    Temperature
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div
                      className={`text-4xl font-bold ${getTempColor(
                        current.temp
                      )}`}
                    >
                      {current.temp.toFixed(1)}°C
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Light Level Card */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    {current.light ? (
                      <MoonIcon className="mr-2" />
                    ) : (
                      <SunIcon className="mr-2" />
                    )}
                    Light Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div className="text-4xl font-bold">
                      {current.light ? "Dark" : "Bright"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Distance Card */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2" />
                    Distance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div className="text-4xl font-bold text-yellow-500">
                      {current.dist.toFixed(1)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Turbidity Card */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <DropletIcon className="mr-2" />
                    Turbidity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div className="text-4xl font-bold text-blue-400">
                      {current.turb.toFixed(1)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Light Control</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    className={`w-full ${
                      lightStatus
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-gray-600 hover:bg-gray-700"
                    }`}
                    onClick={toggleLight}
                  >
                    {lightStatus ? (
                      <>
                        <SunIcon className="mr-2 h-4 w-4" />
                        Light ON
                      </>
                    ) : (
                      <>
                        <MoonIcon className="mr-2 h-4 w-4" />
                        Light OFF
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Feed Control</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    className={`w-full ${
                      feedStatus
                        ? "bg-green-500 hover:bg-green-600"
                        : feedCooldown
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    onClick={triggerFeed}
                    disabled={feedCooldown}
                  >
                    <Fish className="mr-2 h-4 w-4" />
                    {feedStatus
                      ? "Feeding..."
                      : feedCooldown
                      ? "Cooldown"
                      : "Feed Now"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6">
              {/* Temperature Chart */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Temperature History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis
                          dataKey="time"
                          stroke="#888"
                          tick={{ fill: "#888" }}
                        />
                        <YAxis
                          stroke="#888"
                          tick={{ fill: "#888" }}
                          domain={["dataMin - 1", "dataMax + 1"]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#222",
                            border: "1px solid #444",
                            color: "#fff",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="temperature"
                          stroke="#10b981"
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Turbidity Chart */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Turbidity History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis
                          dataKey="time"
                          stroke="#888"
                          tick={{ fill: "#888" }}
                        />
                        <YAxis
                          stroke="#888"
                          tick={{ fill: "#888" }}
                          domain={["dataMin - 1", "dataMax + 1"]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#222",
                            border: "1px solid #444",
                            color: "#fff",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="turbidity"
                          stroke="#60a5fa"
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Distance Chart */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Distance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis
                          dataKey="time"
                          stroke="#888"
                          tick={{ fill: "#888" }}
                        />
                        <YAxis
                          stroke="#888"
                          tick={{ fill: "#888" }}
                          domain={["dataMin - 1", "dataMax + 1"]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#222",
                            border: "1px solid #444",
                            color: "#fff",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="distance"
                          stroke="#fbbf24"
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Light Chart */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Light Level History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis
                          dataKey="time"
                          stroke="#888"
                          tick={{ fill: "#888" }}
                        />
                        <YAxis
                          stroke="#888"
                          tick={{ fill: "#888" }}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#222",
                            border: "1px solid #444",
                            color: "#fff",
                          }}
                          formatter={(value: any) => [
                            value === 0 ? "Dark" : "Bright",
                            "Light",
                          ]}
                        />
                        <Line
                          type="stepAfter"
                          dataKey="light"
                          stroke="#f472b6"
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
