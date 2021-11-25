import path from 'path'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { config } from 'dotenv'
import movies from './routes/movies.routes.js'
import genres from './routes/genres.routes.js'
import auth from './routes/auth.routes.js'
import account from './routes/account.routes.js'
import people from './routes/people.routes.js'
import status from './routes/status.routes.js'
import errorMiddleware from './middleware/error.middleware.js'
import passport from 'passport'
import './passport/index.js'
import { initDriver } from './neo4j.js'

import { init as initDB } from './initDB/init.js';

// Load config from .env
config()

// Create Express instance
const app = express()

// Authentication
app.use(passport.initialize())

app.use(cors())
app.use(bodyParser.json())

// Connect to Neo4j and Verify Connectivity
const {
  NEO4J_URI,
  NEO4J_USERNAME,
  NEO4J_PASSWORD,
} = process.env

await initDriver(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD);
let empty = true;
if (empty) {
  await initDB();
}

// Serve the UI
app.use(express.static('public'))

// Register Route Handlers
app.use('/api/movies', movies)
app.use('/api/genres', genres)
app.use('/api/auth', auth)
app.use('/api/account', account)
app.use('/api/people', people)
app.use('/api/status', status)

// Handle Errors
app.use(errorMiddleware)

// Server all other routes as index.html
app.use((req, res) => {
  if (req.header('Content-Type') === 'application/json') {
    return res.status(404).json({
      error: 404,
      message: 'Page not found'
    })
  }
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'))
})

// Listen
const port = process.env.APP_PORT || 3000

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${process.env.APP_PORT || 3000}/`)
})
