import React, { useEffect, useState } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import mqtt from 'mqtt';
import GaugeChart from 'react-gauge-chart';

const MQTT_BROKER = process.env.REACT_APP_MQTT_BROKER || 'mqtt';
const MQTT_PORT = process.env.REACT_APP_MQTT_PORT || 1883;
const MQTT_TOPIC = 'car/data';

function App() {
  const [data, setData] = useState({
    rpm: 0,
    accelerator_pos: 0,
    brake_position: 0,
    gear: 'N',
    fuel_level: 0
  });

  useEffect(() => {
    const client = mqtt.connect(`mqtt://${MQTT_BROKER}:${MQTT_PORT}`);

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      client.subscribe(MQTT_TOPIC);
    });

    client.on('message', (topic, message) => {
      const newData = JSON.parse(message.toString());
      setData(newData);
    });

    return () => {
      client.end();
    };
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Car HUD
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {/* RPM Gauge */}
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">RPM</Typography>
            <GaugeChart
              id="rpm-gauge"
              nrOfLevels={20}
              percent={Math.min(data.rpm / 8000, 1)}
              arcWidth={0.3}
              arcPadding={0.05}
              cornerRadius={3}
              colors={['#FF5F6D', '#FFC371']}
            />
            <Typography variant="h4">{Math.round(data.rpm)}</Typography>
          </Paper>

          {/* Accelerator Position */}
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Accelerator Position</Typography>
            <Box sx={{ height: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: 40,
                  height: `${data.accelerator_pos}%`,
                  backgroundColor: '#4CAF50',
                  transition: 'height 0.1s ease-in-out'
                }}
              />
            </Box>
            <Typography variant="h4">{Math.round(data.accelerator_pos)}%</Typography>
          </Paper>

          {/* Brake Position */}
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Brake Position</Typography>
            <Box sx={{ height: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: 40,
                  height: `${data.brake_position}%`,
                  backgroundColor: '#f44336',
                  transition: 'height 0.1s ease-in-out'
                }}
              />
            </Box>
            <Typography variant="h4">{Math.round(data.brake_position)}%</Typography>
          </Paper>

          {/* Gear and Fuel Level */}
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Gear: {data.gear}</Typography>
            <Typography variant="h6">Fuel Level</Typography>
            <Box sx={{ height: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: 40,
                  height: `${data.fuel_level}%`,
                  backgroundColor: '#2196F3',
                  transition: 'height 0.1s ease-in-out'
                }}
              />
            </Box>
            <Typography variant="h4">{Math.round(data.fuel_level)}%</Typography>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}

export default App; 