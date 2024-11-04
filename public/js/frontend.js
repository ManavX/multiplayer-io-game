const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io();

const scoreEl = document.querySelector('#scoreEl')

const devicePixelRatio = window.devicePixelRatio || 1

canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio

const x = canvas.width / 2
const y = canvas.height / 2

const players = {}
const frontEndProjectiles = {}

socket.on('updatePlayers', (backendPlayers) => {
  for (const id in backendPlayers) {
    const backendPlayer = backendPlayers[id]

    if (!players[id]) {
      players[id] = new Player({
        x: backendPlayer.x, 
        y: backendPlayer.y, 
        radius: 10, 
        color: backendPlayer.color
      })

      document.querySelector(
        '#playerLabels'
        ).innerHTML += `<div data-id="${id}" data-score="${backendPlayer.score}">
      ${backendPlayer.username}: ${backendPlayer.score}</div>`

    } else {

      document.querySelector(
        `div[data-id="${id}"]`
        ).innerHTML = `${backendPlayer.username}: ${backendPlayer.score}`

      document
      .querySelector(`div[data-id="${id}"]`)
      .setAttribute('data-score', backendPlayer.score)


      // sorts leaderboard (player divs)
      const parentDiv = document.querySelector('#playerLabels')
      const childDivs = Array.from(parentDiv.querySelectorAll('div'))

      childDivs.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))
        return scoreB - scoreA
      })

      // removes old elements
      childDivs.forEach((div) => {
        parentDiv.removeChild(div)
      })

      // adds sorted eleemnts
      childDivs.forEach((div) => {
        parentDiv.appendChild(div)
      })

      if (id === socket.id) {

        const lastBackendInputIndex = playerInputs.findIndex((input) => {
          return backendPlayer.sequenceNumber === input.sequenceNumber
        })
        if (lastBackendInputIndex > -1) {
          playerInputs.splice(0, lastBackendInputIndex + 1)
        }

        playerInputs.forEach((input) => {
          players[id].x += input.dx
          players[id].y += input.dy
        })

        players[id].x = backendPlayer.x
        players[id].y = backendPlayer.y
      } else {
        // all other players

        gsap.to(players[id], {
          x: backendPlayer.x,
          y: backendPlayer.y,
          duration: 0.015,
          ease: 'linear'
        })
      } 
    }
  }

    // delete frontend players
    for (const id in players) {
      if (!backendPlayers[id]) {

        const divToDelete = document.querySelector(`div[data-id="${id}"]`)
        divToDelete.parentNode.removeChild(divToDelete)

        if (id === socket.id) {
          document.querySelector('#usernameForm').style.display = 'block'
        }

        delete players[id]
      }
    }
  })

socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id]

    if (!frontEndProjectiles[id]) {
  
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y, 
        radius: 5,
        color: players[backEndProjectile.playerId]?.color,
        velocity: backEndProjectile.velocity
      })
    } else {
      frontEndProjectiles[id].x += backEndProjectiles[id].velocity.x
      frontEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    }
  }

  for (const frontEndProjectileId in frontEndProjectiles) {
      if (!backEndProjectiles[frontEndProjectileId]) {
        delete frontEndProjectiles[frontEndProjectileId]
      }
    }
})

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  for (const id in players) {
      const player = players[id]
      player.draw()
    }

  for (const id in frontEndProjectiles) {
      const frontEndProjectile = frontEndProjectiles[id]
      frontEndProjectile.draw()
    }

  // for (let i = frontEndProjectiles.length - 1; i >= 0; i--) {
  //     const frontEndProjectile = frontEndProjectiles[i]
  //     frontEndProjectile.update()

  //   }
  }
  

animate()

const SPEED = 10
const playerInputs = []
let sequenceNumber = 0

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}

setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber, dx: 0, dy: -SPEED })
    players[socket.id].y -= SPEED
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber })
  }
  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber, dx: -SPEED, dy: 0 })
    players[socket.id].x -= SPEED
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber })
  }
  if (keys.s.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber, dx: 0, dy: SPEED })
    players[socket.id].y += SPEED
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber })
  }
  if (keys.d.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber, dx: SPEED, dy: 0 })
    players[socket.id].x += SPEED
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber })
  }

}, 15)

window.addEventListener('keydown', (event) => {
  if (!players[socket.id]) return

  switch(event.code) {
    case 'KeyW':
      keys.w.pressed = true
      break
    case 'KeyA':
      keys.a.pressed = true
      break
    case 'KeyS':
      keys.s.pressed = true
      break
    case 'KeyD':
      keys.d.pressed = true
      break
  }
})

window.addEventListener('keyup', (event) => {
  if (!players[socket.id]) return

  switch(event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break
    case 'KeyA':
      keys.a.pressed = false
      break
    case 'KeyS':
      keys.s.pressed = false
      break
    case 'KeyD':
      keys.d.pressed = false
      break
  }
})

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
    event.preventDefault()

    const usernameInput = document.querySelector('#usernameInput').value.trim();
    const username = usernameInput === '' ? 'An unnamed player' : usernameInput;

    document.querySelector('#usernameForm').style.display = 'none'
    socket.emit('initGame', {
      width: canvas.width, 
      height: canvas.height,
      devicePixelRatio, 
      username
    })
})
