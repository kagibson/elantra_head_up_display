FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY public/index.html ./public/index.html

EXPOSE 3000

RUN echo "Current directory:" && pwd && \
    echo "Directory contents:" && ls -la && \
    echo "Public directory contents:" && ls -la public

#CMD ["npm", "start"] 
CMD ["ls", "-la"]