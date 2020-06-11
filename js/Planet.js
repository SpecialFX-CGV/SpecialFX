// Class for Planes
class Planet{
  constructor( radius, planetMaterial, x, y, z, name, scene){

    var planet_geometry = new THREE.TetrahedronBufferGeometry( radius, 4 );
    var planet_material = new THREE.MeshPhongMaterial( { color: '#9f8d4a', shading: THREE.FlatShading});
    this.planet = new THREE.Mesh( planet_geometry, planet_material );

    this.planet.receiveShadow = true;
    this.planet.position.set(x,y,z);

    scene.add(this.planet);
    // create Cannon planet
    var planetShape = new CANNON.Sphere(radius);
    this.cannon = new CANNON.Body({ mass: 0, material: groundMaterial, shape: planetShape });

    this.cannon.position.x = this.planet.position.x;
    this.cannon.position.z = this.planet.position.y;
    this.cannon.position.y = this.planet.position.z;
    this.cannon.quaternion.x = -this.planet.quaternion.x;
    this.cannon.quaternion.z = -this.planet.quaternion.y;
    this.cannon.quaternion.y = -this.planet.quaternion.z;
    this.cannon.quaternion.w = this.planet.quaternion.w;

    world.add(this.cannon);

    // Array for movable objects
    this.movableObjects = new Array();

    this.radius = radius;
    this.collectables = new Array();

    // Planet Orbit Variables
    this.orbitAroundCenter = false;
    this.r = new THREE.Vector3(0,0,0).distanceTo(this.planet.position);
    this.theta = 0;
    this.dTheta = 2 * Math.PI / 1000;
    this.scene = scene;

    // pivot is the planets group. It holds all the objects that are affected by the planet's
    // gravitational field. If you make an object and want to add it to the planet, you have to
    // add it to the planets pivot. It will move the object with regards to the planets rotation and orbit.
    this.pivot = new THREE.Group();
    this.pivot.position.copy(this.planet.position);
    this.planet.add(this.pivot);
    this.planet.name = name;
    this.pivot.name = name;
    this.cannon.name = name;
    WorldObjects.push(this.planet);
    WorldCannonObjects.push(this.cannon);
    PlanetClasses.push(this);
    AnimateObject.push(this);
  }

  setCannonPosition( mesh ){
		mesh.cannon.position.x = mesh.position.x;
		mesh.cannon.position.z = mesh.position.y;
		mesh.cannon.position.y = mesh.position.z;
		mesh.cannon.quaternion.x = -mesh.quaternion.x;
		mesh.cannon.quaternion.z = -mesh.quaternion.y;
		mesh.cannon.quaternion.y = -mesh.quaternion.z;
		mesh.cannon.quaternion.w = mesh.quaternion.w;
	  }

	setMeshPosition( mesh ) {
		  mesh.position.x = mesh.cannon.position.x;
		  mesh.position.z = mesh.cannon.position.y;
		  mesh.position.y = mesh.cannon.position.z;
		  mesh.quaternion.x = -mesh.cannon.quaternion.x;
		  mesh.quaternion.z = -mesh.cannon.quaternion.y;
		  mesh.quaternion.y = -mesh.cannon.quaternion.z;
		  mesh.quaternion.w = mesh.cannon.quaternion.w;
	  }

    updatePlanetObjects(){
      var parent = this;
      this.collectables.forEach(function(obj){
        parent.setMeshPosition(obj.mesh);
        parent.setCannonPosition(obj.mesh);
      });
    }

  addObject( obj, theta, phi, height, isCannonObject){
   var SphereCoords = new THREE.Spherical(this.radius + height , theta,phi );
   var vec = new THREE.Vector3().setFromSpherical(SphereCoords);
   this.positionObject(obj,vec);
   if(isCannonObject){
      obj.lookAt(new THREE.Vector3(0,0,0));
     	obj.cannon.position.x = obj.position.x;
     	obj.cannon.position.z = obj.position.y;
     	obj.cannon.position.y = obj.position.z;
     	obj.cannon.quaternion.x = -obj.quaternion.x;
     	obj.cannon.quaternion.z = -obj.quaternion.y;
     	obj.cannon.quaternion.y = -obj.quaternion.z;
     	obj.cannon.quaternion.w = obj.quaternion.w;
   }
  }

  addToPivot(obj){
		var coords = {x:obj.position.x, y:obj.position.y, z: obj.position.z};
		var rotat = {x:obj.rotation.x, y:obj.rotation.y, z: obj.rotation.z};
		this.pivot.add(obj);
		obj.position.set(coords.x,coords.y,coords.z);
		obj.rotation.set(rotat.x,rotat.y,rotat.z);
	}

  addFBXObject(objectPath,theta, phi, height){
    var SphereCoords = new THREE.Spherical(this.radius + height , theta,phi );
    var vec = new THREE.Vector3().setFromSpherical(SphereCoords);
    var path = objectPath.path;
    var planet = this;
    loader.load( path, function ( obj ) {

					object.traverse( function ( child ) {

						if ( child.isMesh ) {

							child.castShadow = true;
							child.receiveShadow = true;

						}

					} );
          obj.scale.set(objectPath.x,objectPath.y,objectPath.z);
          planet.positionObject(obj,vec);
				});
  }

  positionObject(object,vec){
          object.position.add(vec);
          object.castShadow = true;
          var up = object.position.clone().normalize();
          object.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(object.up,up).multiply(object.quaternion));
          object.position.add(this.planet.position.clone().negate());
          this.addToPivot(object);
  }

  addObjObject(objectPath, theta, phi, height){
    var SphereCoords = new THREE.Spherical(this.radius + height , theta,phi );
    var vec = new THREE.Vector3().setFromSpherical(SphereCoords);
    var path = objectPath.path;
    var materialPath = objectPath.materialPath;
    var planet = this;
    // Loads the material
    loaderMTL.load(materialPath, function ( materials ) {
      materials.preload();
      var loaderOBJ = new THREE.OBJLoader();
      loaderOBJ.setMaterials(materials);
      loaderOBJ.load(
        path,
        function (object) {
              object.scale.set(objectPath.x,objectPath.y,objectPath.z);
              planet.positionObject(object,vec);
          },
          undefined, // We don't need this function
          function (error) {
            console.error(error);
        });
    });
  }

  addCanister(theta, phi, height){
    var SphereCoords = new THREE.Spherical(this.radius + height , theta,phi );
    var vec = new THREE.Vector3().setFromSpherical(SphereCoords);
    var planet = this;

    // Load a glTF resource
    loaderGLTF.load(
      // resource URL
      'models/tPose.glb',
      // called when the resource is loaded
      function ( gltf ) {
        //scene.add( gltf.scene );
        var obj = gltf.scene;
        planet.positionObject(obj,vec);
      },
      undefined, // We don't need this function
      function (error) {
        console.error(error);
      }
    );
  }

  addCollectables(value,isHealth){
    for (var i =0 ;i<value;i+=1){
      this.collectables.push(new Canister(this.collectables.length,this,isHealth));
    }
  }

  centerOrbit(boolVal){
    this.orbitAroundCenter = boolVal;
  }

  // Object that can move with the planet and be removed
  add(obj){ // Needs further thought
    this.pivot.add(obj);
    this.movableObjects.push(obj);
  }

  remove(obj){
    var index = this.movableObjects.indexOf(obj);
    if( index > -1 ){
        this.movableObjects.splice(index, 1);
    }
  }

  spawnRocks(value){
    for (var i =0 ;i<value;i+=1){
      this.addObjObject(Rocks[parseInt((Math.random()*(Rocks.length-1)),10)],Math.random()*2*Math.PI,Math.random()*2*Math.PI,-2);
    }
  }

  spawnTrees(value){
    for (var i =0 ;i<value;i+=1){
      this.addObjObject(Trees[parseInt((Math.random()*(Trees.length-1)),10)],Math.random()*2*Math.PI,Math.random()*2*Math.PI,-3);
    }
  }


	/**
		* Function to rotate the planet
		* @param {type} xRotation Float
		* @param {type} yRotation Float
 	*/
  animate(){
    // When you change the rotation or position of a physi object
    // you need to declare the change with mesh.__dirtyPosition = true;
    // mesh.__dirtyRotation = true;
    //this.planet.rotation.y += 0.01;
    //this.movableObjects.forEach(function(object){object.animate();});
    this.updatePlanetObjects();
    if(this.orbitAroundCenter){
      //Moon orbit
      this.theta += this.dTheta;
      var xTrans = this.r * Math.cos(this.theta) - this.pivot.position.x;
      var yTrans = this.r * Math.sin(this.theta) - this.pivot.position.y;

      //this.movableObjects.forEach(function(object){object.position.x += xTrans;object.position.y += yTrans;});

      this.planet.position.x += xTrans/1500;
      this.planet.position.y += yTrans/1500;
    }
  }
}
