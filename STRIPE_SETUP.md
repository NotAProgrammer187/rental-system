# 🔑 Stripe Setup Guide

This guide will help you set up Stripe payment integration for your rental system.

## 📋 Prerequisites

1. **Stripe Account** - You need a Stripe account (free to create)
2. **Node.js** - Version 18 or higher
3. **MongoDB** - Running database
4. **Stripe CLI** - For local webhook testing (recommended)

## 🚀 Step-by-Step Setup

### 1. Create a Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Click "Start now" or "Sign up"
3. Fill in your business information
4. Verify your email address
5. Complete the account setup process

### 2. Get Your API Keys

1. **Log into Stripe Dashboard**
   - Go to [dashboard.stripe.com](https://dashboard.stripe.com)
   - Sign in with your Stripe account

2. **Navigate to Developers Section**
   - In the left sidebar, click on "Developers"
   - Then click on "API keys"

3. **Find Your Keys**
   - You'll see two types of keys:
     - **Publishable key** (starts with `pk_test_` or `pk_live_`)
     - **Secret key** (starts with `sk_test_` or `sk_live_`)

4. **Copy Your Keys**
   - **For Development**: Use the "Test" keys (starts with `pk_test_` and `sk_test_`)
   - **For Production**: Use the "Live" keys (starts with `pk_live_` and `sk_live_`)

### 3. Install Stripe CLI (For Local Webhook Testing)

The Stripe CLI allows you to test webhooks locally by forwarding events to your local server.

#### Windows Installation

1. **Download Stripe CLI**
   - Go to [github.com/stripe/stripe-cli/releases](https://github.com/stripe/stripe-cli/releases)
   - Download the latest Windows release (e.g., `stripe_X.X.X_windows_x86_64.zip`)

2. **Extract and Install**
   ```bash
   # Extract the zip file
   # Copy stripe.exe to a folder in your PATH (e.g., C:\Windows\System32)
   # Or add the folder to your PATH environment variable
   ```

3. **Alternative: Using Chocolatey**
   ```bash
   choco install stripe-cli
   ```

#### macOS Installation

```bash
# Using Homebrew
brew install stripe/stripe-cli/stripe

# Or download from GitHub releases
```

#### Linux Installation

```bash
# Download and install
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

### 4. Authenticate Stripe CLI

1. **Login to Stripe**
   ```bash
   stripe login
   ```

2. **Follow the prompts**
   - This will open your browser
   - Authorize the Stripe CLI
   - Copy the authorization code back to the terminal

### 5. Set Up Environment Variables

#### Backend Configuration

Create or update your `backend/.env` file:

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
```

#### Frontend Configuration

Create or update your `frontend/.env` file:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 6. Test Your Integration

#### Test Card Numbers

Use these test card numbers to test payments:

| Card Type | Number | Expiry | CVC |
|-----------|--------|--------|-----|
| Visa | `4242 4242 4242 4242` | Any future date | Any 3 digits |
| Visa (declined) | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| Mastercard | `5555 5555 5555 4444` | Any future date | Any 3 digits |
| American Express | `3782 822463 10005` | Any future date | Any 4 digits |

#### Test the Payment Flow

1. **Start your application**
   ```bash
   npm run dev
   ```

2. **Start Stripe CLI webhook forwarding**
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```

3. **Create a test booking**
   - Go to any rental property
   - Click "Book Now"
   - Fill in the booking details
   - Proceed to payment

4. **Test payment**
   - Use one of the test card numbers above
   - Any future expiry date
   - Any 3-4 digit CVC
   - Complete the payment

### 7. Webhook Setup

#### For Local Development (Using Stripe CLI)

1. **Start webhook forwarding**
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```

2. **Copy the webhook secret**
   - The CLI will output a webhook secret like: `whsec_1234567890abcdef...`
   - Copy this to your `backend/.env` file as `STRIPE_WEBHOOK_SECRET`

3. **Test webhooks**
   - Make test payments
   - Check the CLI output for webhook events
   - Verify your backend receives the events

#### For Production

1. **In Stripe Dashboard**
   - Go to Developers > Webhooks
   - Click "Add endpoint"

2. **Add Webhook Endpoint**
   - **URL**: `https://yourdomain.com/api/payments/webhook`
   - **Events to send**:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`

3. **Get Webhook Secret**
   - After creating the webhook, click on it
   - Find the "Signing secret"
   - Copy it to your `STRIPE_WEBHOOK_SECRET` environment variable

## 🔒 Security Best Practices

### 1. Never Commit API Keys

- **Never** commit your `.env` files to version control
- Add `.env` to your `.gitignore` file
- Use environment variables in production

### 2. Use Test Keys for Development

- Always use test keys (`pk_test_`, `sk_test_`) for development
- Only use live keys (`pk_live_`, `sk_live_`) in production

### 3. Secure Your Keys

- Keep your secret keys secure
- Don't share them in public repositories
- Use different keys for different environments

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that your API keys are correct
   - Make sure you're using the right environment (test vs live)

2. **"Payment failed" error**
   - Use the correct test card numbers
   - Check that the card details are valid

3. **"Webhook signature verification failed"**
   - Verify your webhook secret is correct
   - Make sure the webhook URL is accessible

4. **"URL must be publicly accessible" error**
   - Use Stripe CLI for local testing: `stripe listen --forward-to localhost:5000/api/payments/webhook`
   - For production, use a publicly accessible URL

### Getting Help

- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: [support.stripe.com](https://support.stripe.com)
- **Stripe Community**: [community.stripe.com](https://community.stripe.com)

## 📊 Monitoring

### Stripe Dashboard

Monitor your payments in the Stripe Dashboard:

1. **Payments**: View all payment attempts
2. **Customers**: Manage customer information
3. **Refunds**: Track refunds and disputes
4. **Analytics**: View payment analytics and reports

### Test Mode vs Live Mode

- **Test Mode**: Use for development and testing
- **Live Mode**: Use for real payments in production

## 🎯 Next Steps

1. **Install Stripe CLI** for local webhook testing
2. **Test the complete payment flow** with webhooks
3. **Set up webhooks for production**
4. **Configure your business information**
5. **Set up your payout schedule**
6. **Review Stripe's compliance requirements**

## 📞 Support

If you need help with Stripe integration:

1. Check the [Stripe Documentation](https://stripe.com/docs)
2. Visit the [Stripe Community](https://community.stripe.com)
3. Contact [Stripe Support](https://support.stripe.com)

---

**Happy coding! 🚀**
