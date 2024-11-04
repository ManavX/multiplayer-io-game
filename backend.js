const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000})

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const players = {}
const backEndProjectiles = {}

const SPEED = 10
const RADIUS = 10
const PROJECTILE_RADIUS = 5
let projectileId = 0

io.on('connection', (socket) => {
  console.log('a user connected');


  io.emit('updatePlayers', players)

  socket.on('shoot', ({x, y, angle}) => {
    projectileId++;

    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
     }

    backEndProjectiles[projectileId] = {
      x, 
      y,
      velocity,
      playerId: socket.id
    }
  })

  socket.on('initGame', ({username, width, height, devicePixelRatio}) => {
    players[socket.id] = {
    x:500 * Math.random(),
    y:500 * Math.random(),
    color: `hsl(${360 * Math.random()}, 100%, 50%)`,
    sequenceNumber: 0,
    score: 0,
    username
    }
    // init canvas
    players[socket.id].canvas = {
      width,
      height
    }

    players[socket.id].radius = RADIUS

    if (devicePixelRatio > 1) {
      players[socket.id].radius = 2 * RADIUS
    }

  })


  socket.on('disconnect', (reason) => {
    console.log(reason)
    delete players[socket.id]
    io.emit('updatePlayers', players)
  })

  socket.on('keydown', ({keycode}, sequenceNumber) => {
    players[socket.id].sequenceNumber = sequenceNumber
    switch(keycode) {
      case 'KeyW':
        players[socket.id].y -= SPEED
        break

      case 'KeyA':
        players[socket.id].x -= SPEED
        break

      case 'KeyS':
        players[socket.id].y += SPEED
        break

      case 'KeyD':
        players[socket.id].x += SPEED
        break
    }
   
    io.emit('updatePlayers', players)
  })

  console.log(players)
});

setInterval( () => {

  for (const id in backEndProjectiles) {
      backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
      backEndProjectiles[id].y += backEndProjectiles[id].velocity.y

      const PROJECTILE_RADIUS = 5
      if (backEndProjectiles[id].x - PROJECTILE_RADIUS >= 
        players[backEndProjectiles[id].playerId]?.canvas?.width || 
        backEndProjectiles[id].x - PROJECTILE_RADIUS <= 0 || 
        backEndProjectiles[id].y - PROJECTILE_RADIUS >= 
        players[backEndProjectiles[id].playerId]?.canvas?.height || 
        backEndProjectiles[id].y - PROJECTILE_RADIUS <= 0) {

        delete backEndProjectiles[id]
        continue
      }

      for (const playerId in players) {
        const backEndPlayer = players[playerId]

        // collision detection
        const DISTANCE = Math.hypot(
         backEndProjectiles[id].x - backEndPlayer.x,
         backEndProjectiles[id].y - backEndPlayer.y)

        if (DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius &&
          backEndProjectiles[id].playerId !== playerId) {
          if (players[backEndProjectiles[id].playerId])
            players[backEndProjectiles[id].playerId].score += 100
          delete backEndProjectiles[id]
          delete players[playerId]
          break
        }
      }
    }

  io.emit('updatePlayers', players)
  io.emit('updateProjectiles', backEndProjectiles)
}, 15)

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
