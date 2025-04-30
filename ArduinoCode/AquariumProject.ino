#include <WiFi.h>
#include <WebSocketsClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP32Servo.h>

// Replace with your network credentials
const char* ssid = "Pranav’s iPhone";
const char* password = "pranavjp";

// WebSocket server address
const char* serverIP = "172.20.10.2";  // Replace with your Node.js server IP
const int serverPort = 8080;  // Port your WebSocket server is listening on

WebSocketsClient webSocket;

#define DS18B20 13    //Connect to GPIO2 pin
OneWire ourWire(DS18B20);
DallasTemperature sensor(&ourWire);
// ESP32 code to control LED strip using L298N based on light sensor input
const int CONTROL_PIN = 12;    // Control pin for L298N (connected to ESP32)
const int LIGHT_SENSOR_PIN = 32; // Analog input for Flying Fish light sensor
const int LIGHT_THRESHOLD = 2000; // Threshold to determine dark/light (adjust as needed)
const int READING_DELAY = 500;    // Time between light readings in milliseconds

bool userlight = false;

//ESP32 Code for HC-SR04
#define TRIG_PIN 18  // Pin connected to the Trig pin of the HC-SR04
#define ECHO_PIN 19 // Pin connected to the Echo pin of the HC-SR04

float measureDistance() {
  // Send a 10-microsecond pulse to the trigger pin
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Measure the duration of the echo pulse
  long duration = pulseIn(ECHO_PIN, HIGH);

  // Calculate the distance in cm
  // Speed of sound = 343 m/s = 0.0343 cm/µs
  float distance = (duration * 0.0343) / 2;

  return distance;
}

int sensorPin = 35; //For turbidity

Servo myservo;
int servoPin = 14; //For servo

bool feeding = true;

void setup() {
  // Start Serial communication
  Serial.begin(115200);
  //scanWiFi();  
  // Connect to Wi-Fi
  sensor.begin(); 

  pinMode(CONTROL_PIN, OUTPUT);
  pinMode(LIGHT_SENSOR_PIN, INPUT);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
    //Serial.println(WiFi.status());
  }
  Serial.println("Connected to WiFi");

  // Set pin modes for HC-SR04
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  myservo.attach(servoPin);
  myservo.write(45);

  // WebSocket Event Handler
  webSocket.begin(serverIP, serverPort, "/");  // URL path can be empty or provided
  webSocket.onEvent(webSocketEvent);
}

void sendData(float temperature, int lightValue, float distance, int turbidity) {
  String message = "{\"temp\": " + String(temperature, 1) +
                   ", \"light\": " + String(lightValue) +
                   ", \"distance\": " + String(distance, 1) +
                   ", \"turbidity\": " + String(turbidity) + "}" ;
  webSocket.sendTXT(message);
}

void feed() {
  feeding = true;
  myservo.write(180);
  delay(1000);
  myservo.write(45);
  delay(500);
}

void userlighton() {
  digitalWrite(CONTROL_PIN, HIGH);
}
void userlightoff(){
  digitalWrite(CONTROL_PIN, LOW);
}

void loop() {
  // Maintain WebSocket connection and process incoming messages
  webSocket.loop();

  Serial.println("Here 1");
  //LIGHT SENSOR CODE START
  int lightLevel = analogRead(LIGHT_SENSOR_PIN);\
  Serial.print("Light level is ");
  Serial.println(lightLevel);
  bool isDark = (lightLevel < LIGHT_THRESHOLD);
  if (isDark) {
    digitalWrite(CONTROL_PIN, HIGH);
    Serial.println("It's dark - LED strip ON");
  } else {
    if(userlight==false)
    {
      digitalWrite(CONTROL_PIN, LOW);
    }
    Serial.println("It's bright - LED strip OFF");
  };
  //LIGHT SENSOR CODE END

  Serial.println("Here 2");
  //TEMP SENSOR CODE START
  sensor.requestTemperatures(); 
  float tempC=sensor.getTempCByIndex(0);
  float tempF=sensor.getTempFByIndex(0);
  //TEMP SENSOR CODE END


  Serial.println("Here 3");
  //Depth Sensor start
  float distance = measureDistance();
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  //Depth Sensor end


  Serial.println("Here 4");
  //Turbidity Sensor
  int sensorValue = analogRead(sensorPin);
  Serial.println(sensorValue);
  int turbidity = map(sensorValue, 0, 2500, 100, 0);
  Serial.print("Turbidity: ");
  Serial.print(turbidity);
  Serial.println("%");

  sendData(tempC,isDark ? 1:0,distance,turbidity);
  
  delay(500);
  


}

// WebSocket Event Handling Function
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("Connected to WebSocket server");
      break;
      
    case WStype_DISCONNECTED:
      Serial.println("Disconnected from WebSocket server");
      break;

    case WStype_TEXT:
      Serial.print("Received text: ");
      Serial.println((char*)payload);

      if (String((char*)payload) == "feed") {
        if(feeding==false){ //To avoid race condition
          //feed();
          feeding = false;
        }
      }
      else if(String((char*)payload) == "light on"){
        Serial.println("Turning lights on");
        userlight = true;
        userlighton();
      }
      else  if(String((char*)payload) == "light off"){
        Serial.println("Turning lights off");
        userlight = false;
        userlightoff();
      }
      break;
      
    default:
      break;
  }
}
