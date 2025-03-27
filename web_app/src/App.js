import React, { useEffect, useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, ThemeProvider, createTheme } from '@mui/material';
import mqtt from 'mqtt';
import GaugeChart from 'react-gauge-chart';

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
      main: '#00ff00',
    },
    secondary: {
      main: '#2196F3',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
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
    accelerator_position: 0,
    fuel_level: 0,
    dtcs: []
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [mqttClient, setMqttClient] = useState(null);

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
  };

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
            Car Heads Up Display / Diagnostics
          </Typography>
          
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
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>RPM</Typography>
              <Box sx={{ position: 'relative', height: 200, mb: 2 }}>
                <GaugeChart
                  id="rpm-gauge"
                  nrOfLevels={20}
                  percent={Math.min(data.rpm / 8000, 1)}
                  arcWidth={0.3}
                  arcPadding={0.05}
                  cornerRadius={3}
                  colors={['#FF5F6D', '#FFC371']}
                  hideText={true}
                />
                <Typography 
                  variant="h3" 
                  sx={{ 
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'primary.main',
                    fontWeight: 'bold',
                  }}
                >
                  {Math.round(data.rpm)}
                </Typography>
              </Box>
            </Paper>

            {/* Accelerator Position */}
            <Paper sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#4CAF50' }}>Accelerator Pedal Position</Typography>
              <Box sx={{ 
                height: 200, 
                display: 'flex', 
                alignItems: 'flex-end', 
                justifyContent: 'center',
                mb: 2,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #4CAF50, transparent)',
                }
              }}>
                <Box
                  sx={{
                    width: 40,
                    height: `${data.accelerator_position}%`,
                    backgroundColor: '#4CAF50',
                    transition: 'height 0.3s ease-in-out',
                    borderRadius: '4px 4px 0 0',
                    boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)',
                  }}
                />
              </Box>
              <Typography variant="h3" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                {Math.round(data.accelerator_position)}%
              </Typography>
            </Paper>

            {/* Fuel Level */}
            <Paper sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#2196F3' }}>Fuel Level</Typography>
              <Box sx={{ 
                height: 200, 
                display: 'flex', 
                alignItems: 'flex-end', 
                justifyContent: 'center',
                mb: 2,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #2196F3, transparent)',
                }
              }}>
                <Box
                  sx={{
                    width: 40,
                    height: `${data.fuel_level}%`,
                    backgroundColor: '#2196F3',
                    transition: 'height 0.3s ease-in-out',
                    borderRadius: '4px 4px 0 0',
                    boxShadow: '0 0 10px rgba(33, 150, 243, 0.3)',
                  }}
                />
              </Box>
              <Typography variant="h3" sx={{ color: '#2196F3', fontWeight: 'bold' }}>
                {Math.round(data.fuel_level)}%
              </Typography>
            </Paper>

            {/* DTC Console */}
            <Paper sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>Diagnostic Trouble Codes</Typography>
              <TextField
                multiline
                fullWidth
                rows={6}
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