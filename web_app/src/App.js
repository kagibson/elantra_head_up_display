import React, { useEffect, useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, ThemeProvider, createTheme, Tabs, Tab } from '@mui/material';
import SwipeableViews from 'react-swipeable-views-react-18-fix';
import mqtt from 'mqtt';
import GaugeChart from 'react-gauge-chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MQTT_BROKER = process.env.REACT_APP_MQTT_BROKER || 'mqtt';
const MQTT_PORT = process.env.REACT_APP_MQTT_PORT || 9001;
const MQTT_PROTOCOL = process.env.REACT_APP_MQTT_PROTOCOL || 'ws';
const MQTT_TOPIC = 'car/data';
const MQTT_COMMAND_TOPIC = 'car/command';

// Create dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7A8B99', // Steel blue-gray
    },
    secondary: {
      main: '#C4CCD4', // Light steel
    },
    background: {
      default: '#1C1C1E', // Deep onyx
      paper: '#2C2C2E', // Lighter onyx
    },
    text: {
      primary: '#E5E5E5', // Light gray
      secondary: '#A0A0A0', // Medium gray
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#C4CCD4', // Light steel
    },
    h6: {
      fontWeight: 500,
      color: '#7A8B99', // Steel blue-gray
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease-in-out',
          background: 'linear-gradient(145deg, #2C2C2E 0%, #252527 100%)', // Subtle metallic gradient
          '&:hover': {
            boxShadow: '0 8px 12px rgba(0, 0, 0, 0.3)',
            filter: 'brightness(1.05)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 24px',
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  const [data, setData] = useState({
    rpm: 0,
    speed: 0,
    accelerator_position: 0,
    fuel_level: 0,
    dtcs: [],
    vin: '',
    engine_load_history: [],
    engine_load: null,
    coolant_temp: null,
    ambient_temp: null,
    dtc_clear_time: null
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [mqttClient, setMqttClient] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    const client = mqtt.connect(`${MQTT_PROTOCOL}://${MQTT_BROKER}:${MQTT_PORT}`);
    setMqttClient(client);

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

  const handleClearDTCs = () => {
    if (mqttClient) {
      mqttClient.publish(MQTT_COMMAND_TOPIC, JSON.stringify({ command: 'clear_dtcs' }));
    }
    setOpenDialog(false);
    setData(prevData => ({ ...prevData, dtcs: [], dtc_clear_time: Date.now() }));
  };

  const handleChangeTab = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleChangeIndex = (index) => {
    setTabIndex(index);
  };

  const LiveData = () => (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: 3,
      '& > *': {
        p: 3,
      }
    }}>
          {/* RPM Gauge */}
      <Paper sx={{ textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Engine RPM</Typography>
        <Box sx={{ position: 'relative', height: 200, mb: 2 }}>
            <GaugeChart
              id="rpm-gauge"
              nrOfLevels={20}
              percent={Math.min(data.rpm / 8000, 1)}
              arcWidth={0.3}
              arcPadding={0.05}
              cornerRadius={3}
            colors={['#7A8B99', '#C4CCD4']} // Steel colors
            hideText={true}
          />
          <Typography 
            variant="h3" 
            sx={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#C4CCD4',
              fontWeight: 'bold',
            }}
          >
            {Math.round(data.rpm)}
          </Typography>
        </Box>
          </Paper>

      {/* Speed Gauge */}
      <Paper sx={{ textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Speed (km/h)</Typography>
        <Box sx={{ position: 'relative', height: 200, mb: 2 }}>
          <GaugeChart
            id="speed-gauge"
            nrOfLevels={20}
            percent={Math.min(data.speed / 200, 1)}
            arcWidth={0.3}
            arcPadding={0.05}
            cornerRadius={3}
            colors={['#7A8B99', '#C4CCD4']} // Steel colors
            hideText={true}
          />
          <Typography 
            variant="h3" 
                sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#C4CCD4',
              fontWeight: 'bold',
            }}
          >
            {Math.round(data.speed)}
          </Typography>
        </Box>
      </Paper>

      {/* Engine Load Graph */}
      <Paper sx={{ textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Engine Load History (1 min)</Typography>
        <Box sx={{ 
          height: 200,
          mb: 2,
          px: 2
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.engine_load_history || []}
              margin={{
                top: 5,
                right: 5,
                left: 5,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
              <XAxis 
                dataKey="time" 
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(unixTime) => {
                  const date = new Date(unixTime * 1000);
                  return `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}`;
                }}
                stroke="#C4CCD4"
                minTickGap={30}
              />
              <YAxis 
                domain={[0, 100]} 
                unit="%" 
                stroke="#C4CCD4"
                tickCount={6}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#2C2C2E',
                  border: '1px solid #7A8B99',
                  borderRadius: '4px'
                }}
                labelFormatter={(unixTime) => {
                  const date = new Date(unixTime * 1000);
                  return `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}`;
                }}
                formatter={(value) => [`${value.toFixed(1)}%`, 'Engine Load']}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#7A8B99" 
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Typography variant="h3" sx={{ color: '#C4CCD4', fontWeight: 'bold' }}>
          {data.engine_load ? `${Math.round(data.engine_load)}%` : 'N/A'}
        </Typography>
      </Paper>

      {/* Fuel Level and Temperatures */}
      <Paper sx={{ textAlign: 'center', p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Vehicle Status</Typography>
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          height: '200px',
        }}>
          {/* Fuel Level */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            <Box sx={{ 
              color: '#7A8B99',
              fontSize: '24px',
              width: '24px',
            }}>
              ⛽
            </Box>
            
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'row',
              gap: '3px',
              width: '150px',
            }}>
              {[...Array(10)].map((_, index) => (
                <Box
                  key={index}
                sx={{
                    width: '8px',
                    height: '30px',
                    backgroundColor: index < Math.ceil(data.fuel_level / 10) ? '#7A8B99' : '#3C3C3E',
                    borderRadius: '4px',
                    transition: 'background-color 0.3s ease'
                  }}
                />
              ))}
            </Box>
            <Typography sx={{ color: '#C4CCD4', minWidth: '50px' }}>
              {Math.round(data.fuel_level)}%
            </Typography>
          </Box>

          {/* Coolant Temperature */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            <Box sx={{ 
              color: '#7A8B99',
              fontSize: '24px',
              width: '24px',
            }}>
              🌡️
            </Box>
            <Typography sx={{ color: '#C4CCD4' }}>
              Coolant: {data.coolant_temp !== null ? `${Math.round(data.coolant_temp)}°C` : 'N/A'}
            </Typography>
          </Box>

          {/* Ambient Temperature */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            <Box sx={{ 
              color: '#7A8B99',
              fontSize: '24px',
              width: '24px',
            }}>
              🌤️
            </Box>
            <Typography sx={{ color: '#C4CCD4' }}>
              Ambient: {data.ambient_temp !== null ? `${Math.round(data.ambient_temp)}°C` : 'N/A'}
            </Typography>
          </Box>
        </Box>
          </Paper>
    </Box>
  );

  const ErrorCodes = () => {
    const getTimeSinceDTCsClear = () => {
      if (!data.dtc_clear_time) return 'Never cleared';
      
      const seconds = Math.floor(Date.now() / 1000 - data.dtc_clear_time);
      if (seconds < 60) return `${seconds} seconds ago`;
      
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      
      const days = Math.floor(hours / 24);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    };

    return (
      <Box sx={{ p: 3 }}>
        {/* VIN Display */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>Vehicle Information</Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              p: 2,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'primary.main'
            }}>
              <Typography sx={{ mr: 2, color: 'text.secondary' }}>VIN:</Typography>
              <Typography 
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '1.2rem',
                  letterSpacing: '0.1em',
                  color: 'text.primary'
                }}
              >
                {data.vin || 'Reading VIN...'}
              </Typography>
            </Box>

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              p: 2,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'primary.main'
            }}>
              <Typography sx={{ mr: 2, color: 'text.secondary' }}>DTCs Last Cleared:</Typography>
              <Typography 
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  color: 'text.primary'
                }}
              >
                {getTimeSinceDTCsClear()}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* DTCs Display */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>Diagnostic Trouble Codes</Typography>
          <TextField
            multiline
            fullWidth
            rows={12}
            value={data.dtcs?.length ? data.dtcs.join('\n') : 'No DTCs detected'}
            InputProps={{
              readOnly: true,
              sx: {
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                color: 'primary.main',
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              }
            }}
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => setOpenDialog(true)}
            sx={{ 
              mt: 2,
              '&:hover': {
                boxShadow: '0 0 15px rgba(0, 255, 0, 0.3)',
              }
            }}
          >
            Clear Diagnostic Trouble Codes
          </Button>
          </Paper>
        </Box>
    );
  };

  const FreezeFrame = () => (
    <Box sx={{ p: 3 }}>
      {/* DTC Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>Triggering DTC</Typography>
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Freeze Frame DTC</Typography>
            <Typography 
              sx={{ 
                fontFamily: 'monospace',
                fontSize: '1.2rem',
                letterSpacing: '0.1em',
                color: data.freeze_dtc ? 'error.main' : 'text.primary'
              }}
            >
              {data.freeze_dtc || 'No freeze frame data available'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Sensor Snapshots Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>Sensor Snapshots</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Vehicle conditions at the time the DTC was set
        </Typography>

        {/* Engine Performance */}
        <Typography variant="subtitle1" sx={{ color: 'primary.main', mt: 3, mb: 2 }}>Engine Performance</Typography>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 2,
          mb: 3
        }}>
          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Engine RPM</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.rpm || 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Engine Load</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.engine_load ? `${Math.round(data.engine_load)}%` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Engine Coolant Temperature</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.coolant_temp !== null ? `${Math.round(data.coolant_temp)}°C` : 'N/A'}
            </Typography>
          </Box>
        </Box>

        {/* Vehicle Speed and Fuel */}
        <Typography variant="subtitle1" sx={{ color: 'primary.main', mt: 3, mb: 2 }}>Vehicle Speed and Fuel</Typography>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 2,
          mb: 3
        }}>
          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Vehicle Speed</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.speed ? `${data.speed} km/h` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Fuel Level</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.fuel_level ? `${Math.round(data.fuel_level)}%` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Fuel Pressure</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.fuel_pressure ? `${data.fuel_pressure} kPa` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Fuel System Status</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.fuel_system_status || 'N/A'}
            </Typography>
          </Box>
        </Box>

        {/* Air and Temperature */}
        <Typography variant="subtitle1" sx={{ color: 'primary.main', mt: 3, mb: 2 }}>Air and Temperature</Typography>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 2,
          mb: 3
        }}>
          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Intake Manifold Pressure</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.intake_pressure ? `${data.intake_pressure} kPa` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Intake Air Temperature</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.intake_temp !== null ? `${Math.round(data.intake_temp)}°C` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Ambient Air Temperature</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.ambient_temp !== null ? `${Math.round(data.ambient_temp)}°C` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Mass Air Flow Rate</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.maf_air_rate ? `${data.maf_air_rate} g/s` : 'N/A'}
            </Typography>
          </Box>
        </Box>

        {/* Fuel Trim */}
        <Typography variant="subtitle1" sx={{ color: 'primary.main', mt: 3, mb: 2 }}>Fuel Trim</Typography>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 2,
          mb: 3
        }}>
          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Short Term Fuel Trim Bank 1</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.stft_bank1 !== null ? `${data.stft_bank1}%` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Long Term Fuel Trim Bank 1</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.ltft_bank1 !== null ? `${data.ltft_bank1}%` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Short Term Fuel Trim Bank 2</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.stft_bank2 !== null ? `${data.stft_bank2}%` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Long Term Fuel Trim Bank 2</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.ltft_bank2 !== null ? `${data.ltft_bank2}%` : 'N/A'}
            </Typography>
          </Box>
        </Box>

        {/* Timing and Throttle */}
        <Typography variant="subtitle1" sx={{ color: 'primary.main', mt: 3, mb: 2 }}>Timing and Throttle</Typography>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 2
        }}>
          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Timing Advance</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.timing_advance !== null ? `${data.timing_advance}°` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Throttle Position</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.throttle_position ? `${Math.round(data.throttle_position)}%` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Commanded Throttle Actuator</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.commanded_throttle ? `${Math.round(data.commanded_throttle)}%` : 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            p: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>Accelerator Pedal Position</Typography>
            <Typography sx={{ color: 'text.primary', fontSize: '1.2rem' }}>
              {data.accelerator_position ? `${Math.round(data.accelerator_position)}%` : 'N/A'}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default',
        py: 4
      }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              textAlign: 'center',
              mb: 4,
              color: 'primary.main',
              textShadow: '0 0 10px rgba(0, 255, 0, 0.3)',
            }}
          >
            OBD2 Scanner
          </Typography>

          <Tabs
            value={tabIndex}
            onChange={handleChangeTab}
            variant="fullWidth"
            sx={{
              mb: 2,
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: 'primary.main',
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main',
              }
            }}
          >
            <Tab label="Live Data" />
            <Tab label="Error Codes" />
            <Tab label="Freeze Frame" />
          </Tabs>

          <SwipeableViews
            index={tabIndex}
            onChangeIndex={handleChangeIndex}
          >
            <LiveData />
            <ErrorCodes />
            <FreezeFrame />
          </SwipeableViews>
        </Container>

        {/* Confirmation Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)}
          PaperProps={{
            sx: {
              bgcolor: 'background.paper',
              borderRadius: 2,
            }
          }}
        >
          <DialogTitle sx={{ color: 'primary.main' }}>Clear Diagnostic Trouble Codes</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to clear the DTC's?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>No</Button>
            <Button 
              onClick={handleClearDTCs} 
              color="primary" 
              autoFocus
              sx={{
                '&:hover': {
                  boxShadow: '0 0 15px rgba(0, 255, 0, 0.3)',
                }
              }}
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App; 