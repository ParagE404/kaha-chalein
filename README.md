# Kaha Chalein

A mobile web app for groups to decide which restaurant to visit together. Built with Next.js and Node.js.

## Features

- User-friendly interface for restaurant selection
- Real-time collaboration using WebSocket
- QR code sharing for easy session joining
- Tinder-like card swiping interface
- Restaurant matching based on group preferences
- Support for Mumbai restaurants

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Zomato API key (for restaurant data)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd kahachalein
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
```

4. Create a `.env` file in the server directory:
```
ZOMATO_API_KEY=your_api_key_here
PORT=3001
```

5. Start the development servers:

Frontend:
```bash
npm run dev
```

Backend:
```bash
cd server
npm run dev
```

The app will be available at `http://localhost:3000`

## Usage

1. Open the app in your mobile browser
2. Enter your details on the welcome page
3. Select restaurant types you're interested in
4. Share the QR code with your friends
5. Swipe right on restaurants you like, left to skip
6. View the final result that matches everyone's preferences

## Tech Stack

- Frontend:
  - Next.js
  - React
  - Socket.IO Client
  - React Swipeable
  - QRCode.react

- Backend:
  - Node.js
  - Express
  - Socket.IO
  - Axios

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
