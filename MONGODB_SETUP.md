# MongoDB Setup Guide

## 🚨 Current Issue: MongoDB Connection Failed

You're getting this error because MongoDB isn't running locally. Here are two solutions:

## Solution 1: MongoDB Atlas (Recommended - Easiest)

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and create an account
3. Choose "FREE" tier (M0)

### Step 2: Create a Cluster
1. Click "Build a Database"
2. Choose "FREE" tier
3. Select your preferred cloud provider and region
4. Click "Create"

### Step 3: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database password

### Step 4: Update Environment Variables
1. Open `backend/.env`
2. Replace the MONGODB_URI line with your Atlas connection string:

```env
MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/rental-system?retryWrites=true&w=majority
```

## Solution 2: Local MongoDB

### Step 1: Install MongoDB
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Follow installation instructions for your OS

### Step 2: Start MongoDB Service

#### Windows:
```cmd
# If installed as a service
net start MongoDB

# Or start manually
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
```

#### macOS:
```bash
# Using Homebrew
brew services start mongodb-community

# Or manually
mongod --config /usr/local/etc/mongod.conf
```

#### Linux:
```bash
# Ubuntu/Debian
sudo systemctl start mongod

# Or manually
mongod
```

### Step 3: Verify MongoDB is Running
```bash
# Test connection
mongosh
# or
mongo
```

## Quick Fix for Development

If you want to get started quickly, here's a temporary solution:

1. **Use MongoDB Atlas (5 minutes setup):**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create free account
   - Create free cluster
   - Get connection string
   - Update `backend/.env`

2. **Or use a temporary MongoDB service:**
   - Use [MongoDB Atlas Free Tier](https://www.mongodb.com/atlas/database) (512MB free)
   - No installation required
   - Works immediately

## Environment File Example

Your `backend/.env` should look like this:

```env
# For MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rental-system?retryWrites=true&w=majority

# For local MongoDB
# MONGODB_URI=mongodb://localhost:27017/rental-system

PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_here
CORS_ORIGIN=http://localhost:3000
```

## Next Steps

1. Choose one of the solutions above
2. Update your `backend/.env` file
3. Restart your application:
   ```bash
   npm run dev
   ```

## Need Help?

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)
- [MongoDB Connection String Format](https://docs.mongodb.com/manual/reference/connection-string/)


