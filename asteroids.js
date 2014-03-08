// Global area
var ctx,
    handler,
    game = new Game(),
    pressedKeys = new Array(),
    releasedKeys = new Array();

AsteroidType = {
  big: {
    id: 0,
    radius: 80,
    colour: "rgba(200, 200, 100, 1)",
    speed: 1,
    score: 10
  },
  medium: {
    id: 1,
    radius: 50,
    colour: "rgba(200, 100, 100, 1)",
    speed: 2,
    score: 20
  },
  small: {
    id: 2,
    radius: 30,
    colour: "rgba(200, 100, 0, 1)",
    speed: 3,
    score: 40
  },
  tiny: {
    id: 3,
    radius:10,
    colour: "rgba(200, 0, 0, 1)",
    speed: 4,
    score: 60
  }
}

PlayerStatus = {
  static: 0,
  speedUpForward: 1,
  speedUpBackward: 2,
  speedDown: 3
}

Key = {
  left: 37,
  right: 39,
  up: 38,
  down: 40,
  space: 32
}   

BulletStatus = {
  ready: 0,
  dead: 1
}
    
// ---------------------------------------------------------------
// ASTEROID OBJECT

function drawCircle(x, y, radius, colour) {
  window.ctx.fillStyle = colour;
  window.ctx.beginPath();
  window.ctx.arc(x, y, radius , 0, Math.PI*2, true);
  window.ctx.closePath();
  window.ctx.fill();
}

function randomNumberUpTo(value) {
  return Math.floor((Math.random() * value) + 1);
}

function Asteroid(type) {
  this.x = 100;
  this.y = 100;
  this.speed = 1;
  this.type = type;
  var direction = randomNumberUpTo(359);
    
  $.extend(this, {
    render: function() {
      drawCircle(this.x, this.y, this.type.radius, this.type.colour);
    },
    
    stepX: function() {
      this.x += Math.cos(convertToRadians(direction - 90)) * this.type.speed;
      if (this.x > window.ctx.canvas.width + this.type.radius)
	this.x = - this.type.radius;
      if (this.x < -this.type.radius)
	this.x = window.ctx.canvas.width +  this.type.radius;
    },
    
    stepY: function() {
      this.y += Math.sin(convertToRadians(direction - 90)) * this.type.speed;
      if (this.y > window.ctx.canvas.height + this.type.radius)
	this.y = -this.type.radius;
      if (this.y < -this.type.radius)
	this.y = window.ctx.canvas.height + this.type.radius;
    },
    
    step: function() {
      this.stepX(); this.stepY();
    }

  });
}

// ---------------------------------------------------------------
// PLAYER OBJECT
function drawLine(x1, y1, x2, y2, thickness) {
  window.ctx.beginPath();
  window.ctx.moveTo(x1,y1);
  window.ctx.lineTo(x2,y2);
  window.ctx.lineWidth = thickness;
  window.ctx.strokeStyle = "#cfc";
  window.ctx.stroke();
}

function convertToRadians(degree) {
  return degree*(Math.PI/180);
}

function drawTriangle(x, y, w, h, angle) {
  window.ctx.save();
  window.ctx.translate(x, y);
  window.ctx.rotate(convertToRadians(angle));
  
  var posx = w / 2 * -1;
  var posy = h / 2;
  
  drawLine(posx, posy, posx+w, posy);
  drawLine(posx, posy, posx+w/2, posy-h);
  drawLine(posx + w, posy, posx+w/2, posy-h);
  
  window.ctx.restore();
}

function Player() {
    this.x = ctx.canvas.width / 2;
    this.y = ctx.canvas.height / 2;
    this.angle = 0;
    this.rotationSpeed = 3;
    this.velocity = 0.0;
    this.status = PlayerStatus.static;
    this.dead = false;
    
    var maxVelocity = 30.0,
	speed = 0.3,
	width = 20,
	height = 35;
    
    $.extend(this, {
      render: function() {
	if (!this.dead) {
	  drawTriangle(this.x, this.y, width, height, this.angle);
	}
      },
      
      left: function() {
	this.angle -= this.rotationSpeed;
	if (this.angle < 0) this.angle == 359;
      },
      
      right: function() {
	this.angle += this.rotationSpeed;
	if (this.angle > 360) this.angle = 0;
      },
      
      step: function() {
	if (this.status != PlayerStatus.static) {
	  var dir = convertToRadians(this.angle - 90);
	  
	  if (this.status == PlayerStatus.speedDown) {
	    if (this.velocity >= 0.3) {
	      this.velocity -= speed;
	    }
	    else if (this.velocity <= -0.3) {
	      this.velocity += speed;
	    }
	    else {
	      this.status = PlayerStatus.static;
	      return;
	    }
	  }
	  
	  this.x += Math.cos(dir) * this.velocity;
	  this.y += Math.sin(dir) * this.velocity;
	  
	  // check bounds
	  if (this.x > window.ctx.canvas.width + width)
	    this.x = - width;
	  if (this.x < -width)
	    this.x = window.ctx.canvas.width +  width
	
	  if (this.y > window.ctx.canvas.height + height)
	    this.y = -height;
	  if (this.y < -height)
	    this.y = window.ctx.canvas.height + height;
	}
      },
      
      speedUpForward: function() {
	if (this.velocity < maxVelocity)
	  this.velocity += speed;
	
	this.status = PlayerStatus.speedUpForward;
      },
      
      speedUpBackward: function() {
	if (this.velocity > maxVelocity * -1)
	  this.velocity -= speed;
	
	this.status = PlayerStatus.speedUpBackward;
      },
      
      addFriction: function() {
	if (this.velocity != 0) 
	  this.status = PlayerStatus.speedDown;
	else
	  this.status = PlayerStatus.static;
      }
    });
}

// ---------------------------------------------------------------
// BULLET OBJECT

function drawBullet(x, y, height, angle) {
  window.ctx.save();
  window.ctx.translate(x, y);
  window.ctx.rotate(convertToRadians(angle));
  
  drawLine(0, 0, 0, height);
  
  window.ctx.restore();
}

function Bullet(player) {
  this.x = player.x;
  this.y = player.y;
  this.angle = player.angle;
  this.steps = 0;
  this.status = BulletStatus.ready;
  
  var height = 10,
      maxSteps = 100,
      speed = 8;
  
  $.extend(this, {
    render: function() {
      drawBullet(this.x, this.y, height, this.angle);
    },
    
    step: function() {
      if (this.status != BulletStatus.dead) {
	this.steps++;
	if (this.steps > maxSteps) {
	  this.status = BulletStatus.dead;
	}
	
	var dir = convertToRadians(this.angle - 90);
	
	this.x += Math.cos(dir) * speed;
	this.y += Math.sin(dir) * speed;
	
	// check bounds
	if (this.x > window.ctx.canvas.width)
	  this.x = 0;
	if (this.x < 0)
	  this.x = window.ctx.canvas.width
      
	if (this.y > window.ctx.canvas.height)
	  this.y = 0;
	if (this.y < 0)
	  this.y = window.ctx.canvas.height;
      }
    }
  });
}
// ---------------------------------------------------------------
// GAME OBJECT

function drawText(size, text, x, y) {
  window.ctx.font = size + "px 'Press Start 2P'";
  window.ctx.textAlign = "center";
  window.ctx.fillStyle = "#ffffff";
  window.ctx.fillText(text, x, y);
}

function drawTitle() {
  drawText(48, "Asteroids", window.ctx.canvas.width / 2, window.ctx.canvas.height / 2);
  drawText(8, "HTML5 jaffar cardoso", window.ctx.canvas.width / 2, window.ctx.canvas.height / 2 + 10);
  drawText(16, "Press any key to play", window.ctx.canvas.width / 2, window.ctx.canvas.height / 2 + 80);
}

function Game() {
  this.player;
  this.lives = 3;
  this.stage = -1;
  this.score = 0;
  this.asteroids = new Array();
  this.bullets = new Array();
  
  $.extend(this, {
    createAsteroids: function(type, number, dead) {
      var minX = dead.x - dead.type.radius / 2;
      var minY = dead.y - dead.type.radius / 2;
  
      for (var i = 0; i < number; i++) {
	var r = randomNumberUpTo(dead.type.radius),
	    x = minX + r,
	    y = minY + r;
    
	this.asteroids.push(new Asteroid(type));
	var newAsteroid = this.asteroids[this.asteroids.length - 1];
	newAsteroid.x = x;
	newAsteroid.y = y; 
      }
    },

    createChildrenAsteroids: function(dead) {
      switch(dead.type.id) {
	case AsteroidType.big.id:
	  this.createAsteroids(AsteroidType.medium, 2 + Math.floor(this.stage * 0.2), dead);
	  break;
	case AsteroidType.medium.id:
	  this.createAsteroids(AsteroidType.small, 3  + Math.floor(this.stage * 0.2), dead);
	  break;
	case AsteroidType.small.id:
	  this.createAsteroids(AsteroidType.tiny, 2 + Math.floor(this.stage * 0.3), dead);
	  break;
      }
    },
    
    begin: function() {
      this.asteroids = new Array();
      this.bullets = new Array();
      this.player = new Player();
      
      for (var i = 0; i < 1 + Math.floor(this.stage * 0.2); i++) {
	this.asteroids.push(new Asteroid(AsteroidType.big));
      }
    },
    
    fire: function() {
      this.bullets.push(new Bullet(this.player));
    },

    checkBulletCollision: function() {
      if (!this.player.dead) {
	for (var i = 0; i < this.bullets.length; i++) {
	  for (var j = 0; j < this.asteroids.length; j++) {
	    if (Math.pow(this.bullets[i].x - this.asteroids[j].x, 2) + 
		Math.pow(this.bullets[i].y - this.asteroids[j].y, 2) < Math.pow(this.asteroids[j].type.radius,2)) {
	      this.bullets[i].status = BulletStatus.dead;
	      this.score += this.asteroids[j].type.score;
	      this.createChildrenAsteroids(this.asteroids[j]);
	      this.asteroids.splice(j, 1);
	      break;
	    }
	  }
	}
	
	if (this.asteroids.length == 0) {
	  this.stage++;
	  this.begin();
	}
      }
    },

    checkAsteroidCollision: function() {
      if (!this.player.dead) {
	for (var i = 0; i < this.asteroids.length; i++) {
	  var distanceRadius = Math.sqrt(Math.pow(this.asteroids[i].x - this.player.x, 2) + Math.pow(this.asteroids[i].y - this.player.y, 2));
	  if (distanceRadius < (this.asteroids[i].type.radius + 20)) {
	    this.lives--;
	    if (this.lives <= 0) {
	      this.player.dead = true;
	    }
	    else {
	      this.begin();
	    }
	  }
	}
      }
    },
    
    render: function() {
      this.player.step();
      this.player.render();
  
      for (var i = 0; i < this.asteroids.length; i++) {
	this.asteroids[i].step();
	this.asteroids[i].render();
      }
  
      for (var i = 0; i < this.bullets.length; i++) {
	if (this.bullets[i].status == BulletStatus.dead) {
	  this.bullets.splice(i, 1);
	}
	else {
	  this.bullets[i].step();
	  this.bullets[i].render();
	}
      }
      
      this.renderInterface();
  
      this.checkBulletCollision();
      this.checkAsteroidCollision();
    },
    
    renderInterface: function() {
      drawText(8, "Score: " + this.score + " Lives: " + this.lives + " Level: " + this.stage, 120, window.ctx.canvas.height - 20);
      
      if (this.player.dead) {
	drawText(16, "GAME OVER", window.ctx.canvas.width / 2, window.ctx.canvas.height /2);
      }
    },
    
    renderTitle: function() {
      drawTitle();
    }
  });
}

// ---------------------------------------------------------------

function checkKeyInput() {
  if (window.pressedKeys.length > 0) {
    if (window.pressedKeys.indexOf(Key.up) >= 0) {
      window.game.player.speedUpForward();
    }
    
    if (window.pressedKeys.indexOf(Key.down) >= 0) {
      window.game.player.speedUpBackward();
    }
    
    if (window.pressedKeys.indexOf(Key.left) >= 0) {
      window.game.player.left();
    }
    
    if (window.pressedKeys.indexOf(Key.right) >= 0) {
      window.game.player.right();
    }
  }
  
  if (window.releasedKeys.length > 0) {
    var spaceIndex = window.releasedKeys.indexOf(Key.space),
        upIndex    = window.releasedKeys.indexOf(Key.up),
        downIndex  = window.releasedKeys.indexOf(Key.down);
	
    if (spaceIndex >= 0) {
      window.game.fire();
      window.releasedKeys.splice(spaceIndex, 1);
    }
    
    if (upIndex >= 0) {
      window.game.player.addFriction();
      window.releasedKeys.splice(spaceIndex, 1);
    }
    
    if (downIndex >= 0) {
      window.game.player.addFriction();
      window.releasedKeys.splice(spaceIndex, 1);
    }
  }
}

function initGame() {
  window.game.begin();
  
  $(document).keydown(function(e) {
    if (window.game.stage > 0) {
      if (window.pressedKeys.indexOf(e.which) < 0) {
	window.pressedKeys.push(e.which);
      }
    }
    else {
      window.game.stage++;
    }
  });
  
  $(document).keyup(function(e) {
    var indexPressed = window.pressedKeys.indexOf(e.which),
        indexReleased = window.releasedKeys.indexOf(e.which);
	
    if (indexPressed >= 0) {
      window.pressedKeys.splice(indexPressed, 1);
    }
    if (indexReleased < 0) {
      window.releasedKeys.push(e.which);
    }
  });
}

function renderGame() {
  window.ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  
  if (window.game.stage == -1) {
    window.game.renderTitle();
  }
  else if (window.game.stage == 0) {
    window.game.begin();
    window.game.stage++;
  }
  else {
    window.game.render();
    checkKeyInput();
  }
}

// Entry point
$(document).ready(function() {
  var canvas = document.getElementById("game");
  window.ctx = canvas.getContext("2d");

  initGame();
  renderGame();
  handler = setInterval(renderGame, 30);
});
