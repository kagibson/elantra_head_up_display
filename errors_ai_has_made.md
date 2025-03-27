# AI Assistant Errors and Solutions Log

This is a running list of errors that the AI agent made in generating this application for me.

## 1. Missing Requirements File
### Problem
```
ERROR [3/5] COPY requirements.txt .
------
> [3/5] COPY requirements.txt .:
------
Dockerfile:5
--------------------
   3 |     WORKDIR /app
   4 |
   5 | >>> COPY requirements.txt .
   6 |     RUN pip install --no-cache-dir -r requirements.txt
   7 |
--------------------
ERROR: failed to solve: failed to compute cache key: failed to calculate checksum of ref 861cacc3-6eec-42ae-a9ae-e3e6e3405414::ihmbfb8v6d4ktnqwgskyjve44: "/requirements.txt": not found
ERROR: Service 'obd2_collector' failed to build : Build failed
```
### Solution
- Move `requirements.txt` into `obd2_collector` directory

## 2. Incorrect Package Name
### Problem
Incorrect package name specified in requirements.txt
### Solution
Change `pip-obd==0.7.2` to `obd==0.7.2`

## 3. Invalid Package Version
### Problem
```
=> ERROR [4/5] RUN npm install
------
> [4/5] RUN npm install:
npm error code ETARGET
npm error notarget No matching version found for gauge-chart@^0.3.0.
npm error notarget In most cases you or one of your dependencies are requesting
npm error notarget a package version that doesn't exist.
```
### Solution
- Package `gauge-chart` version 0.3.0 does not exist
- Use correct package version that exists in npm registry

## 4. Invalid Docker Compose Flag
### Problem
```bash
$ docker compose up --build --no-cache

unknown flag: --no-cache
```
### Solution
`--no-cache` is not a valid flag for `docker compose up`. Instead:
1. Use `docker compose down -v` first
2. Then run `docker compose up --build`
3. This ensures changes to files are recognized and cache is not used

## 5. Duplicate OBD Connection
### Problem
The MQTT receive message callback was creating a new OBD connection when handling 'clear dtcs' command, even though there was already an active connection in main.

### Solution
Modified code to:
1. Pass existing OBD connection through MQTT client's userdata
2. Access the existing connection in message handler instead of creating new one
3. Improved error handling for connection status


