FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY public/index.html ./public/index.html
COPY config-overrides.js ./

EXPOSE 3000

RUN echo "Current directory:" && pwd && \
    echo "Directory contents:" && ls -la && \
    echo "Public directory contents:" && ls -la public

# Set host to 0.0.0.0 to allow external connections
ENV HOST=0.0.0.0

CMD ["npm", "start"] 
#CMD ["ls", "-la"]