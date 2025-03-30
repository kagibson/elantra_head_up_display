import obd
import time
import json
import paho.mqtt.client as mqtt
import os
from datetime import datetime
import logging
import threading
import queue
import signal
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('obd2_collector.log')
    ]
)

# MQTT Configuration
MQTT_BROKER = os.getenv('MQTT_BROKER', 'mqtt')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_TOPIC = 'car/data'
MQTT_COMMAND_TOPIC = 'car/command'

# OBD2 Configuration
MAX_HISTORY_LENGTH = 600  # 1 minute of data at 10Hz
POLL_INTERVAL = 0.1  # 100ms for live data

class OBD2Collector:
    def __init__(self):
        self.connection = None
        self.mqtt_client = None
        self.running = True
        self.data_queue = queue.Queue()
        self.live_data = {
            'rpm': 0,
            'speed': 0,
            'fuel_level': 0,
            'dtcs': [],
            'vin': '',
            'engine_load_history': [],
            'engine_load': None,
            'coolant_temp': None,
            'ambient_temp': None,
            'dtc_clear_time': None
        }
        self.freeze_frame_data = None
        self.last_dtc_count = 0

    def connect_mqtt(self):
        """Connect to MQTT broker"""
        try:
            self.mqtt_client = mqtt.Client()
            self.mqtt_client.on_connect = self.on_mqtt_connect
            self.mqtt_client.on_message = self.on_mqtt_message
            self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT)
            self.mqtt_client.loop_start()
            logging.info("Connected to MQTT broker")
        except Exception as e:
            logging.error(f"Failed to connect to MQTT broker: {e}")
            raise

    def on_mqtt_connect(self, client, userdata, flags, rc):
        """Callback for when MQTT client connects"""
        if rc == 0:
            logging.info("Connected to MQTT broker")
            client.subscribe(MQTT_COMMAND_TOPIC)
        else:
            logging.error(f"Failed to connect to MQTT broker with code: {rc}")

    def on_mqtt_message(self, client, userdata, msg):
        """Handle incoming MQTT messages"""
        try:
            command = json.loads(msg.payload.decode())
            if command.get('command') == 'clear_dtcs':
                self.clear_dtcs()
        except Exception as e:
            logging.error(f"Error processing MQTT message: {e}")

    def connect_obd(self):
        """Connect to OBD2 adapter"""
        try:
            self.connection = obd.OBD()
            if not self.connection.is_connected():
                raise Exception("Failed to connect to OBD2 adapter")
            logging.info("Connected to OBD2 adapter")
        except Exception as e:
            logging.error(f"Failed to connect to OBD2 adapter: {e}")
            raise

    def get_live_data(self):
        """Collect live data parameters"""
        try:
            # Basic vehicle data
            self.live_data['rpm'] = self.connection.query(obd.commands.RPM).value.magnitude
            self.live_data['speed'] = self.connection.query(obd.commands.SPEED).value.magnitude
            self.live_data['fuel_level'] = self.connection.query(obd.commands.FUEL_LEVEL).value.magnitude
            self.live_data['engine_load'] = self.connection.query(obd.commands.ENGINE_LOAD).value.magnitude
            self.live_data['coolant_temp'] = self.connection.query(obd.commands.COOLANT_TEMP).value.magnitude
            self.live_data['ambient_temp'] = self.connection.query(obd.commands.AMBIANT_AIR_TEMP).value.magnitude

            # Engine load history
            current_time = int(time.time())
            self.live_data['engine_load_history'].append({
                'time': current_time,
                'value': self.live_data['engine_load']
            })
            if len(self.live_data['engine_load_history']) > MAX_HISTORY_LENGTH:
                self.live_data['engine_load_history'].pop(0)

            # DTCs
            dtc_response = self.connection.query(obd.commands.GET_DTC)
            if dtc_response.is_null():
                self.live_data['dtcs'] = []
            else:
                self.live_data['dtcs'] = [str(dtc) for dtc in dtc_response.value]

            # Check if DTCs have changed
            if len(self.live_data['dtcs']) != self.last_dtc_count:
                self.last_dtc_count = len(self.live_data['dtcs'])
                if self.last_dtc_count > 0:
                    self.capture_freeze_frame()

            # VIN (only query once)
            if not self.live_data['vin']:
                vin_response = self.connection.query(obd.commands.VIN)
                if not vin_response.is_null():
                    self.live_data['vin'] = vin_response.value.decode()

        except Exception as e:
            logging.error(f"Error collecting live data: {e}")

    def capture_freeze_frame(self):
        """Capture freeze frame data when a DTC is set"""
        try:
            # Get the freeze frame DTC first
            freeze_dtc_response = self.connection.query(obd.commands.FREEZE_DTC)
            if freeze_dtc_response.is_null():
                logging.warning("No freeze frame DTC available")
                return

            freeze_dtc = str(freeze_dtc_response.value)
            logging.info(f"Capturing freeze frame data for DTC: {freeze_dtc}")

            self.freeze_frame_data = {
                # DTC that triggered the freeze frame
                'freeze_dtc': freeze_dtc,

                # Engine Performance
                'rpm': self.connection.query(obd.commands.RPM).value.magnitude,
                'engine_load': self.connection.query(obd.commands.ENGINE_LOAD).value.magnitude,
                'coolant_temp': self.connection.query(obd.commands.COOLANT_TEMP).value.magnitude,

                # Vehicle Speed and Fuel
                'speed': self.connection.query(obd.commands.SPEED).value.magnitude,
                'fuel_level': self.connection.query(obd.commands.FUEL_LEVEL).value.magnitude,
                'fuel_pressure': self.connection.query(obd.commands.FUEL_PRESSURE).value.magnitude,
                'fuel_system_status': str(self.connection.query(obd.commands.FUEL_SYSTEM_STATUS).value),

                # Air and Temperature
                'intake_pressure': self.connection.query(obd.commands.INTAKE_PRESSURE).value.magnitude,
                'intake_temp': self.connection.query(obd.commands.INTAKE_TEMP).value.magnitude,
                'ambient_temp': self.connection.query(obd.commands.AMBIANT_AIR_TEMP).value.magnitude,
                'maf_air_rate': self.connection.query(obd.commands.MAF_AIR_FLOW_RATE).value.magnitude,

                # Fuel Trim
                'stft_bank1': self.connection.query(obd.commands.SHORT_FUEL_TRIM_1).value.magnitude,
                'ltft_bank1': self.connection.query(obd.commands.LONG_FUEL_TRIM_1).value.magnitude,
                'stft_bank2': self.connection.query(obd.commands.SHORT_FUEL_TRIM_2).value.magnitude,
                'ltft_bank2': self.connection.query(obd.commands.LONG_FUEL_TRIM_2).value.magnitude,

                # Timing and Throttle
                'timing_advance': self.connection.query(obd.commands.TIMING_ADVANCE).value.magnitude,
                'throttle_position': self.connection.query(obd.commands.THROTTLE_POS).value.magnitude,
                'commanded_throttle': self.connection.query(obd.commands.COMMANDED_THROTTLE_ACTUATOR).value.magnitude,
                'accelerator_position': self.connection.query(obd.commands.ACCELERATOR_POS_D).value.magnitude,

                # Timestamp
                'timestamp': int(time.time())
            }
            logging.info("Captured freeze frame data")
        except Exception as e:
            logging.error(f"Error capturing freeze frame data: {e}")

    def clear_dtcs(self):
        """Clear diagnostic trouble codes"""
        try:
            self.connection.query(obd.commands.CLEAR_DTC)
            self.live_data['dtcs'] = []
            self.live_data['dtc_clear_time'] = int(time.time())
            self.freeze_frame_data = None
            self.last_dtc_count = 0
            logging.info("Cleared DTCs")
        except Exception as e:
            logging.error(f"Error clearing DTCs: {e}")

    def publish_data(self):
        """Publish data to MQTT"""
        try:
            # Combine live data with freeze frame data
            data_to_publish = self.live_data.copy()
            if self.freeze_frame_data:
                data_to_publish.update(self.freeze_frame_data)

            logging.info("Publishing data")
            self.mqtt_client.publish(MQTT_TOPIC, json.dumps(data_to_publish))
        except Exception as e:
            logging.error(f"Error publishing data: {e}")

    def run(self):
        """Main collection loop"""
        try:
            self.connect_mqtt()
            self.connect_obd()
            
            while self.running:
                self.get_live_data()
                self.publish_data()
                time.sleep(POLL_INTERVAL)

        except Exception as e:
            logging.error(f"Error in main loop: {e}")
        finally:
            self.cleanup()

    def cleanup(self):
        """Cleanup resources"""
        if self.connection:
            self.connection.close()
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()

    def stop(self):
        """Stop the collector"""
        self.running = False

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logging.info("Received shutdown signal")
    collector.stop()

if __name__ == "__main__":
    collector = OBD2Collector()
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    collector.run() 