import obd
import paho.mqtt.client as mqtt
import time
import json
import os
from collections import deque

# MQTT Configuration
MQTT_BROKER = os.getenv('MQTT_BROKER', 'mqtt')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_TOPIC = 'car/data'
MQTT_COMMAND_TOPIC = 'car/command'

# Maximum number of data points to keep for the engine load history
MAX_HISTORY_LENGTH = 50

# OBD2 Commands we want to monitor
COMMANDS = {
    'rpm': obd.commands.RPM,
    'speed': obd.commands.SPEED,
    'fuel_level': obd.commands.FUEL_LEVEL,
    'engine_load': obd.commands.ENGINE_LOAD,  # Replace accelerator position with engine load
    'dtcs': obd.commands.GET_DTC,
    'vin': obd.commands.VIN,
    'coolant_temp': obd.commands.COOLANT_TEMP,
    'ambient_temp': obd.commands.AMBIANT_AIR_TEMP,
}

# Add timestamp when DTCs were last cleared
dtc_clear_time = None

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code {rc}")
    client.subscribe(MQTT_COMMAND_TOPIC)

def on_message(client, userdata, msg):
    try:
        command = json.loads(msg.payload.decode())
        if command.get('command') == 'clear_dtcs':
            print("Clearing DTCs...")
            connection = userdata.get('obd_connection')
            if connection and connection.is_connected():
                response = connection.query(obd.commands.CLEAR_DTC)
                print(f"DTCs cleared: {response.value}")
                global dtc_clear_time
                dtc_clear_time = time.time()  # Record the time DTCs were cleared
            else:
                print("No active OBD connection available")
    except Exception as e:
        print(f"Error handling command: {e}")

def main():
    # Connect to OBD2 adapter first
    connection = obd.OBD()
    
    if not connection.is_connected():
        print("Failed to connect to OBD2 adapter")
        return

    print("Connected to OBD2 adapter")

    # Connect to MQTT broker
    client = mqtt.Client(userdata={'obd_connection': connection})
    client.on_connect = on_connect
    client.on_message = on_message
    print(MQTT_BROKER)
    print(MQTT_PORT)
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    # Initialize data with empty values
    data = {key: None for key in COMMANDS.keys()}
    # Initialize engine load history
    data['engine_load_history'] = []
    # Initialize DTC clear time
    data['dtc_clear_time'] = dtc_clear_time
    
    while True:
        # Update all values except VIN (which we only need to read once)
        for key, cmd in COMMANDS.items():
            try:
                # Skip VIN reading if we already have it
                if key == 'vin' and data['vin']:
                    continue
                    
                response = connection.query(cmd)
                if response.is_null():
                    data[key] = None
                else:
                    if key == 'dtcs':
                        # Convert DTCs to list of strings
                        data[key] = [str(dtc) for dtc in response.value]
                    elif key == 'vin':
                        # Convert VIN bytes to string if necessary
                        data[key] = str(response.value)
                    elif key == 'engine_load':
                        # Store current engine load value
                        current_load = response.value.magnitude
                        data[key] = current_load
                        # Update history
                        data['engine_load_history'].append({
                            'time': time.time(),
                            'value': current_load
                        })
                        # Keep only the last MAX_HISTORY_LENGTH points
                        if len(data['engine_load_history']) > MAX_HISTORY_LENGTH:
                            data['engine_load_history'] = data['engine_load_history'][-MAX_HISTORY_LENGTH:]
                    else:
                        data[key] = response.value.magnitude
            except Exception as e:
                print(f"Error reading {key}: {e}")
                data[key] = None

        # Update DTC clear time in data
        data['dtc_clear_time'] = dtc_clear_time

        # Publish data to MQTT
        client.publish(MQTT_TOPIC, json.dumps(data))
        
        # Wait for 100ms (10Hz)
        time.sleep(0.1)

if __name__ == "__main__":
    main() 