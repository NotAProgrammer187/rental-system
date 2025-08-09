# 🏠 Rental System

A modern, full-stack rental property management system built with React, Node.js, and MongoDB. Perfect for property owners, renters, and real estate businesses.

![Rental System](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-8.0+-green?style=for-the-badge&logo=mongodb)
![Express](https://img.shields.io/badge/Express-4.18.2-black?style=for-the-badge&logo=express)
![Stripe](https://img.shields.io/badge/Stripe-Payments-blue?style=for-the-badge&logo=stripe)

## ✨ Features

### 🏘️ Property Management
- **Property Listings** - Create and manage rental properties with detailed information
- **Image Storage** - MongoDB-based image storage with Base64 encoding
- **Property Types** - Support for apartments, houses, condos, townhouses, and studios
- **Search & Filter** - Find properties by location, price, and amenities

### 👥 User Management
- **User Authentication** - Secure JWT-based authentication system
- **User Profiles** - Manage personal information and preferences
- **Role-based Access** - Different permissions for hosts and guests

### 📅 Booking System
- **Property Booking** - Easy booking process with date selection
- **Booking Management** - View, cancel, and manage bookings
- **Booking History** - Track past and upcoming bookings
- **Status Tracking** - Real-time booking status updates

### 💳 Payment Integration
- **Stripe Payments** - Secure payment processing with Stripe
- **Payment Status Tracking** - Real-time payment status (pending, completed, failed)
- **Refund Processing** - Automatic refund processing for cancelled bookings
- **Payment History** - Complete payment history in user profile
- **Multiple Payment Methods** - Support for cards and other payment methods

### 🎨 Modern UI/UX
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Tailwind CSS** - Modern, utility-first CSS framework
- **Smooth Animations** - Enhanced user experience with animations
- **Intuitive Navigation** - Easy-to-use interface

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v6 or higher)
- **npm** or **yarn**
- **Stripe Account** (for payment processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/rental-system.git
   cd rental-system
   ```

2. **Install all dependencies** (Backend, Frontend, and Root)
   ```bash
   npm run install-all
   ```
   
   *This command installs dependencies for the root project, backend, and frontend automatically.*

3. **Set up environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/rental-system
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   NODE_ENV=development
   
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
   ```

   Create a `.env` file in the `frontend` directory:
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:5000/api
   
   # Stripe Configuration
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```
   
   *This starts both the backend (port 5000) and frontend (port 3000) servers simultaneously.*

5. **Open your browser**
   
   Navigate to `http://localhost:3000` to access the application.

## 🔧 Payment Integration Setup

### Stripe Configuration

1. **Create a Stripe Account**
   - Sign up at [stripe.com](https://stripe.com)
   - Get your API keys from the Stripe Dashboard

2. **Configure Environment Variables**
   - Add your Stripe secret key to `backend/.env`
   - Add your Stripe publishable key to `frontend/.env`

3. **Set up Webhooks** (Optional for production)
   - In Stripe Dashboard, go to Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/payments/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

4. **Test Payments**
   - Use Stripe test cards for testing
   - Test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

### Payment Features

- **Secure Payment Processing** - All payments processed through Stripe
- **Payment Status Tracking** - Real-time updates on payment status
- **Automatic Refunds** - Refunds processed automatically when bookings are cancelled
- **Payment History** - Complete payment history in user profile
- **Multiple Payment Methods** - Support for various payment methods

## 📁 Project Structure

```
rental-system/
├── backend/                 # Node.js/Express backend
│   ├── config/             # Database configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # Mongoose models
│   │   ├── Payment.js     # Payment model
│   │   ├── Booking.js     # Booking model
│   │   ├── Rental.js      # Rental model
│   │   └── User.js        # User model
│   ├── routes/            # API routes
│   │   ├── payments.js    # Payment routes
│   │   ├── bookings.js    # Booking routes
│   │   ├── rentals.js     # Rental routes
│   │   └── auth.js        # Authentication routes
│   ├── services/          # Business logic
│   │   └── stripeService.js # Stripe payment service
│   ├── uploads/           # Legacy image storage
│   ├── app.js             # Express app configuration
│   └── server.js          # Server entry point
├── frontend/              # React frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   │   ├── PaymentForm.jsx    # Stripe payment form
│   │   │   ├── PaymentHistory.jsx # Payment history component
│   │   │   └── BookingForm.jsx    # Booking form with payment
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── main.jsx       # App entry point
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## 🛠️ Available Scripts

### Root Directory
- `npm run dev` - Start both backend and frontend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend development server
- `npm run install-all` - Install dependencies for all packages
- `npm run build` - Build the frontend for production

### Backend Directory
- `npm run dev` - Start backend with nodemon (auto-restart on changes)
- `npm start` - Start backend in production mode

### Frontend Directory
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/rental-system

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=5000
NODE_ENV=development

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# Optional: External API URLs
VITE_API_URL=http://localhost:5000/api
```

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### MongoDB Setup

1. **Install MongoDB** (if not already installed)
   - [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

2. **Start MongoDB service**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

3. **Create database** (optional - will be created automatically)
   ```bash
   mongo
   use rental-system
   ```

## 🎯 Key Features Explained

### Image Storage System
- **MongoDB Storage**: Images are stored as Base64 strings directly in MongoDB
- **Legacy Support**: Existing images continue to work from the uploads folder
- **Automatic Conversion**: New uploads are automatically converted to Base64
- **Efficient Serving**: Images are served via dedicated API endpoints

### Authentication System
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: Bcrypt encryption for password security
- **Token Verification**: Automatic token validation on protected routes
- **Session Management**: Persistent login sessions

### Booking System
- **Date Validation**: Prevents double bookings and invalid dates
- **Pricing Calculation**: Automatic calculation of total costs
- **Status Management**: Track booking status (pending, confirmed, active, completed, cancelled)
- **Guest Management**: Support for multiple guests and special requests

### Payment System
- **Stripe Integration**: Secure payment processing with Stripe
- **Payment Intents**: Modern payment flow with payment intents
- **Webhook Support**: Real-time payment status updates
- **Refund Processing**: Automatic refunds for cancelled bookings
- **Payment History**: Complete payment tracking and history

## 🚀 Deployment

### Production Build

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```env
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   STRIPE_SECRET_KEY=sk_live_your_stripe_live_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_stripe_live_webhook_secret
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Docker Deployment (Optional)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm run install-all

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/rental-system/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🙏 Acknowledgments

- **React** - Frontend framework
- **Node.js** - Backend runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Stripe** - Payment processing
- **Tailwind CSS** - Styling framework
- **Vite** - Build tool

---

**Made with ❤️ by the Rental System Team**
