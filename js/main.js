//////////////////////////////////////////////////
// GLOBAL vARIABLES                             //
//////////////////////////////////////////////////
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 2000);
var AnimateObject = new Array();
var WorldObjects = new Array();

//////////////////////////////////////////////////
// Renderer                                     //
//////////////////////////////////////////////////

renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setClearColor( 0xffffff );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener( 'resize', onWindowResize, false );


//////////////////////////////////////////////////
// LIGHTING                                     //
//////////////////////////////////////////////////

var ambientLight = new THREE.AmbientLight(0xf1f1f1);
scene.add(ambientLight);

var spotLight = new THREE.DirectionalLight(0xffffff);
spotLight.position.set(60,60,60);
scene.add(spotLight);

//////////////////////////////////////////////////
// CREATING THE WORLD                           //
//////////////////////////////////////////////////

//Objects (We build a mesh using a geometry and a material)
/**
	* Function that makes a sphere
	* @param {type} material THREE.SOME_TYPE_OF_CONSTRUCTED_MATERIAL
	* @param {type} size decimal
	* @param {type} segments integer
	* @returns {getSphere.obj|THREE.Mesh}
*/
function getSphere( material, size, segments){
	var geometry = new THREE.SphereGeometry(size, segments, segments);
	var obj = new THREE.Mesh(geometry, material);
	obj.castShadow = true;
	return obj;
}

/**
	* Function that makes a cube
	* @param {type} material THREE.SOME_TYPE_OF_CONSTRUCTED_MATERIAL
	* @param {type} size decimal
	* @returns {getSquare.obj|THREE.Mesh}
*/
function getSquare(material, size){
	var geometry = new THREE.BoxGeometry(size, size, size);
	var obj = new THREE.Mesh(geometry, material);
	obj.castShadow = true;
	return obj;
}

//////////////////////////////////////////////////
// PLAYER                                       //
//////////////////////////////////////////////////

// Player Controls
var controlsEnabled = false;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;
var prevTime = performance.now();
var velocity = new THREE.Vector3();
var onKeyDown = function ( event ) {
	switch ( event.keyCode ) {
		case 38: // up
		case 87: // w
			moveForward = true;
			break;
		case 37: // left
		case 65: // a
			moveLeft = true; break;
		case 40: // down
		case 83: // s
			moveBackward = true;
			break;
		case 39: // right
		case 68: // d
			moveRight = true;
			break;
		case 32: // space
			if ( canJump === true ) velocity.y += 350;
			canJump = false;
			break;
	}
};
var onKeyUp = function ( event ) {
	switch( event.keyCode ) {
		case 38: // up
		case 87: // w
			moveForward = false;
			break;
		case 37: // left
		case 65: // a
			moveLeft = false;
			break;
		case 40: // down
		case 83: // s
			moveBackward = false;
			break;
		case 39: // right
		case 68: // d
			moveRight = false;
			break;
	}
};
document.addEventListener( 'keydown', onKeyDown, false );
document.addEventListener( 'keyup', onKeyUp, false );

// Raycasting is used for working out which object the mouse is pointing at
var raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
var controls = new THREE.PointerLockControls(camera);
controls.getObject().position.x = 150;
controls.getObject().position.y = 800;
controls.getObject().position.z = 500;
scene.add(controls.getObject());
// Class for Player
class Player{
	constructor(){
		// Variables
		this.TargetPlanet = null;
		this.LandedOnPlanet = false;

		this.SphereCoords = new THREE.Spherical();
		this.SphereCoords.setFromVector3(this.getVector3(controls.getObject().position));

		this.DistanceFromPlanet = 0;
		this.PlayerHeight = 2;
		this.PlanetSphereCoord = new THREE.Spherical();

		this.TravelDistance = 0;
	}

	getVector3(xyz){
		return new THREE.Vector3(xyz.x,xyz.y,xyz.z);
	}

	setTargetPlanet(planet){
		this.TravelDistance = 0;
		this.TargetPlanet = planet;
		this.LandedOnPlanet = false;
		this.DistanceFromPlanet = this.getDistance();
		this.PlanetSphereCoord.setFromVector3( this.getVector3(planet) );
	}

	getDistance(){
		// The distance between the origin of the planet and the position of the player is going to be r
		// d = ((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)^0.5
		if(this.TargetPlanet!== null){
			var con = controls.getObject().position;
			var planet = this.TargetPlanet;
			var d = Math.sqrt(Math.pow(planet.x - con.x,2) + Math.pow(planet.y - con.y,2) + Math.pow(planet.z - con.z,2));
			return d - this.PlayerHeight - planet.radius;
		}
		else return 0;
	}

	animate(){
		if ( controlsEnabled ) {
			if(this.TargetPlanet !== null){
				this.SphereCoords.setFromVector3(this.getVector3(controls.getObject().position));

				raycaster.ray.origin.copy( controls.getObject().position );
				raycaster.ray.origin.y -= 10;

				var intersections = raycaster.intersectObjects( WorldObjects );
				var isOnObject = intersections.length > 0;

				var time = performance.now();
				var delta = ( time - prevTime ) / 1000;

				// After you land the SphereCoords are still centered at (0,0,0) instead
				// of the new planet. We need to find a way to center SphereCoords on the new planet
				if(this.LandedOnPlanet === true){
					// This needs to work on all 3 coordinates. It currently works on two.
					if ( moveForward ) this.SphereCoords.phi -= 1.0 * delta;
					if ( moveBackward ) this.SphereCoords.phi += 1.0 * delta;
					if ( moveLeft ) this.SphereCoords.theta -= 1.0 * delta;
					if ( moveRight ) this.SphereCoords.theta += 1.0 * delta;
				}
				else{
					// Rotate the character


					// Move character towards planet
					var c = controls.getObject().position;
					var p = this.TargetPlanet;
					this.TravelDistance+=0.08;
					var step = (this.TravelDistance/this.DistanceFromPlanet)*(Math.PI/2);
					controls.getObject().position.x = c.x + ((p.x - c.x)*step);
					controls.getObject().position.y = c.y + ((p.y - c.y)*step);
					controls.getObject().position.z = c.z + ((p.z - c.z)*step);
					this.SphereCoords.setFromVector3(this.getVector3(controls.getObject().position));
				}

				if ( isOnObject === true ) {
					this.LandedOnPlanet = true;
					//this.SphereCoords.radius = this.PlayerHeight + this.TargetPlanet.radius;
					canJump = true;
				}
				if(this.LandedOnPlanet === true){
					var Translation = new THREE.Vector3();
					Translation.setFromSpherical(this.SphereCoords);
					controls.getObject().position.x = Translation.x;
					controls.getObject().position.y = Translation.y;
					controls.getObject().position.z = Translation.z;
				}

				if ( this.getDistance()<0 ) {
					this.LandedOnPlanet = true;
					this.SphereCoords.setFromVector3(this.getVector3(controls.getObject().position));
					this.SphereCoords.radius = this.PlayerHeight + this.TargetPlanet.radius;
					var vec = new THREE.Vector3();
					vec.setFromSpherical(this.SphereCoords);
					controls.getObject().position.x = vec.x;
					controls.getObject().position.y = vec.y;
					controls.getObject().position.z = vec.z;

					velocity.y = 0;
					canJump = true;
				}
				prevTime = time;
			}
		}
	}
}

// Class for planets
class Planet{

  /**
    * constructor
    * @param {type} radius Float
    * @param {type} widthSegments integer
    * @param {type}  heightSegments integer
    * @param {type} planetMaterial Material

    for Position
    * @param {type} x Float
    * @param {type} y Float
    * @param {type} z Float

		for rotation
		* @param {type} theta Float
		* @param {type} phi Float
  */
  constructor(radius, width, height, planetMaterial, x, y, z, theta, phi){
    var planetGeometry = new THREE.SphereGeometry(radius, width, height);

    this.radius = radius;
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.z = z;
		this.theta = theta;
		this.phi = phi;

    this.planet = new THREE.Mesh(planetGeometry, planetMaterial);
    this.planet.position.set(x, y, z);
    scene.add(this.planet);
		WorldObjects.push(this.planet);

		// Stores all the objects added to the planet
    this.planetObjects = new Array();
  }

	/**
		* Attaches an object to the planet. This object will then experience
		* the gravitational forces of the planets
		* @param {type} obj Mesh
		* @param {type} r Float
		* @param {type} theta Float
		* @param {type} phi Float
	*/
  addObject(obj, r, theta, phi){
		var vector = new THREE.Vector3();
		var sphere = new THREE.Spherical(r,theta,phi)
		vector.setFromSpherical(sphere);
    obj.position.set(this.x + vector.x,this.y + vector.y, this.z+ vector.z);
    this.planetObjects.push({ObjectVar: obj, SphereCoordinate: sphere});
    scene.add(obj);
  }

	// We are going to need to use polar coordinates
	/**
		* Function to rotate the planet
		* @param {type} theta Float
		* @param {type} phi Float
 	*/
  animate(){
		var theta = this.theta;
		var phi = this.phi;
    this.planet.rotation.x += theta;
    this.planet.rotation.y += phi;

		var planetTheta = this.planet.rotation.x;
		var planetPhi = this.planet.rotation.y;

		for(var i = 0; i<this.planetObjects.length; i++){
			var obj = this.planetObjects[i];
			obj.SphereCoordinate.theta += theta;
			obj.SphereCoordinate.phi += phi;

			var vector = new THREE.Vector3();
			vector.setFromSpherical(obj.SphereCoordinate);

      obj.ObjectVar.position.x = this.x + vector.x;
			obj.ObjectVar.position.y = this.y + vector.y;
      obj.ObjectVar.position.z = this.z + vector.z;
    }
  }
}

//////////////////////////////////////////////////
// IN GAME OBJECT CREATION                      //
//////////////////////////////////////////////////

// Earth
var earthMaterial = new THREE.MeshPhongMaterial({
map: new THREE.ImageUtils.loadTexture("images/texture2.jpg"),
color: 0x72f2f2,
specular: 0xbbbbbb,
shininess: 2
});
var earth = new Planet(20, 50, 50, earthMaterial, -20, -200, -70, 0.01, 0);

var ballMaterial = new THREE.MeshPhongMaterial({
//map: new THREE.ImageUtils.loadTexture("images/texture1.jpg"),
color: 0xf2f2f2,
specular: 0xbbbbbb,
shininess: 2
});
AnimateObject.push(earth);
earth.addObject(getSquare(ballMaterial, 2),23,3,3);
earth.addObject(getSquare(earthMaterial, 2),23,1,2);

// Mars
var marsMaterial = new THREE.MeshPhongMaterial({
//map: new THREE.ImageUtils.loadTexture("images/texture1.jpg"),
color: 0x464742,
specular: 0xbbbbbb,
shininess: 2
});
var mars = new Planet(20, 50, 50, marsMaterial, 40, 40, 40, 0.02, 0);
AnimateObject.push(mars);
mars.addObject(getSquare(earthMaterial, 2, 48),22,0,0);
mars.addObject(getSquare(ballMaterial, 2, 48),22,2,0);

//Stars
var starGeometry = new THREE.SphereGeometry(1000, 50, 500);
var starMaterial = new THREE.MeshPhongMaterial({
map: new THREE.ImageUtils.loadTexture("/images/galaxy_starfield.png"),
side: THREE.DoubleSide,
shininess: 0
});
var starField = new THREE.Mesh(starGeometry, starMaterial);
scene.add(starField);

//Moon
var moonGeometry = new THREE.SphereGeometry(3.5, 50,50);
var moonMaterial = new THREE.MeshPhongMaterial({
map: THREE.ImageUtils.loadTexture("/images/texture7.jpg")
});
var moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(45,20,0);
scene.add(moon);
WorldObjects.push(moon);

// Initialize player
var player = new Player();
AnimateObject.push(player);
player.setTargetPlanet(earth);


//////////////////////////////////////////////////
// MENU AND GAME SCREEN.                        //
//////////////////////////////////////////////////

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );
// https://www.html5rocks.com/en/tutorials/pointerlock/intro/
var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
if ( havePointerLock ) {
	var element = document.body;
	var pointerlockchange = function ( event ) {
		if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
			controlsEnabled = true;
			controls.enabled = true;
			blocker.style.display = 'none';
		} else {
			controls.enabled = false;
			blocker.style.display = '-webkit-box';
			blocker.style.display = '-moz-box';
			blocker.style.display = 'box';
			instructions.style.display = '';
		}
	};
	var pointerlockerror = function ( event ) {
		instructions.style.display = '';
	};
	// Hook pointer lock state change events
	document.addEventListener( 'pointerlockchange', pointerlockchange, false );
	document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
	document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
	document.addEventListener( 'pointerlockerror', pointerlockerror, false );
	document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
	document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );
	instructions.addEventListener( 'click', function ( event ) {
		instructions.style.display = 'none';
		// Ask the browser to lock the pointer
		element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
		if ( /Firefox/i.test( navigator.userAgent ) ) {
			var fullscreenchange = function ( event ) {
				if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {
					document.removeEventListener( 'fullscreenchange', fullscreenchange );
					document.removeEventListener( 'mozfullscreenchange', fullscreenchange );
					element.requestPointerLock();
				}
			};
			document.addEventListener( 'fullscreenchange', fullscreenchange, false );
			document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );
			element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
			element.requestFullscreen();
		} else {
			element.requestPointerLock();
		}
	}, false );
} else {
	instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

//////////////////////////////////////////////////
// RENDERING                                    //
//////////////////////////////////////////////////

// Planet Orbit Variables
var r = 35;
var theta = 0;
var dTheta = 2 * Math.PI / 1000;

var render = function() {
  AnimateObject.forEach(function(object){object.animate();});
  //Moon orbit
  theta += dTheta;
  moon.position.x = r * Math.cos(theta);
  moon.position.z = r * Math.sin(theta);

  renderer.render(scene, camera);
  requestAnimationFrame(render);
};

//////////////////////////////////////////////////
// INITIALISE AND RENDER SCENE                  //
//////////////////////////////////////////////////

render();
