# Use a specific version of the node base image for consistency
FROM node:18

# Set the working directory inside the image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# The application's port
EXPOSE 3000

# Define the command to run your app using CMD which defines your runtime
CMD [ "node", "server.js" ]