# Rental System

A full-stack rental property management system built with React, Node.js, Express, and MongoDB.

## 🚀 Technologies

- **Frontend**: React, Axios, React Router, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Auth**: JWT, bcrypt
- **Database**: MongoDB Atlas or local MongoDB

## 📁 Project Structure

```
rental-system/
├── backend/
│   ├── controllers/
│   ├── models/
│   │   ├── User.js
│   │   └── Rental.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.js
│   │   └── rentals.js
│   ├── middleware/
│   │   └── auth.js
│   ├── config/
│   │   └── database.js
│   ├── .env
│   ├── app.js
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── RentalList.jsx
│   │   │   ├── RentalDetail.jsx
│   │   │   ├── CreateRental.jsx
│   │   │   └── Profile.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── .gitignore
├── README.md
└── package.json
```

## 🛠️ Installation & Setup

### Prerequisites

1. **Node.js** (v14 or higher)
2. **MongoDB** (local installation or MongoDB Atlas account)
3. **Git**

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd rental-system

# Install all dependencies (root, backend, and frontend)
npm run install-all
```

### Step 2: Database Setup

#### Option A: Local MongoDB

1. **Install MongoDB Community Edition**
   - Download from: https://www.mongodb.com/try/download/community
   - Follow installation instructions for your OS

2. **Start MongoDB Service**
   ```bash
   # Windows (if installed as service)
   net start MongoDB
   
   # macOS (using Homebrew)
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

#### Option B: MongoDB Atlas (Recommended for beginners)

1. **Create MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/atlas
   - Sign up for a free account

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose "FREE" tier
   - Select your preferred provider and region
   - Click "Create"

3. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

### Step 3: Environment Configuration

1. **Backend Environment**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit the `.env` file**
   ```env
   # For local MongoDB
   MONGODB_URI=mongodb://localhost:27017/rental-system
   
   # For MongoDB Atlas (replace with your connection string)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rental-system?retryWrites=true&w=majority
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # JWT Secret (change this to a secure random string)
   JWT_SECRET=your_super_secret_jwt_key_here
   
   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

### Step 4: Start the Application

```bash
# Start both frontend and backend (recommended)
npm run dev

# Or start them separately
npm run server  # Backend only (port 5000)
npm run client  # Frontend only (port 3000)
```

## 🔧 Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend development server
- `npm run build` - Build the frontend for production
- `npm run install-all` - Install dependencies for all packages

## 📝 Features

- ✅ User authentication (register/login)
- ✅ JWT-based authorization
- ✅ CRUD operations for rental properties
- ✅ Responsive design with Tailwind CSS
- ✅ Protected routes
- ✅ Modern React with hooks and context
- ✅ Real-time form validation
- ✅ Image upload support
- ✅ User profile management

## 🔐 Environment Variables

### Backend (.env)
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 5000)
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed CORS origin

## 🚀 Deployment

### Backend Deployment
1. **Heroku**
   ```bash
   # Install Heroku CLI
   heroku create your-app-name
   heroku config:set MONGODB_URI=your_mongodb_atlas_uri
   heroku config:set JWT_SECRET=your_jwt_secret
   git push heroku main
   ```

2. **Railway**
   - Connect your GitHub repository
   - Set environment variables
   - Deploy automatically

### Frontend Deployment
1. **Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**
   - Connect your GitHub repository
   - Build command: `npm run build`
   - Publish directory: `dist`

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```
   Error: connect ECONNREFUSED ::1:27017
   ```
   **Solution**: 
   - Make sure MongoDB is running locally
   - Or use MongoDB Atlas (recommended)
   - Check your connection string in `.env`

2. **Port Already in Use**
   ```
   Error: listen EADDRINUSE :::5000
   ```
   **Solution**:
   - Change PORT in `.env` file
   - Or kill the process using the port

3. **Frontend Build Errors**
   ```
   Error: Cannot resolve module
   ```
   **Solution**:
   - Run `npm install` in frontend directory
   - Clear node_modules and reinstall

4. **CORS Errors**
   ```
   Error: Access to fetch at 'http://localhost:5000/api' from origin 'http://localhost:3000' has been blocked by CORS policy
   ```
   **Solution**:
   - Check CORS_ORIGIN in backend `.env`
   - Make sure frontend is running on port 3000

### Getting Help

1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure MongoDB is running and accessible
4. Check if all dependencies are installed

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Search existing issues
3. Create a new issue with detailed information