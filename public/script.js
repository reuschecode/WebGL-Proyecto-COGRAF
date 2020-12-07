var scene = new THREE.Scene();
scene.background = new THREE.Color( 0x72645b );
scene.fog = new THREE.Fog(0x72645b, 2, 15);

var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );

//#region CAMERA SETTINGS
camera.position.set( 0, 1.3, 3 );
camera.lookAt( 0, 1, 0 );
//#endregion

let flagCorazon = true;
let flagPulmon = true;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio( window.devicePixelRatio );
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
});
//musica
var audio = new THREE.AudioListener();

var sound = new THREE.Audio(audio);
var corazonSound = new THREE.Audio(audio);
var respiracionSound = new THREE.Audio(audio);

var loaderSound = new THREE.AudioLoader();
loaderSound.load('assets/navidad.mp3',(audio) => {
    sound.setBuffer(audio);
    sound.setVolume(0.025);
    sound.play();
});
loaderSound.load('assets/latido.mp3',(audio) => {
    corazonSound.setBuffer(audio);
    corazonSound.play();
})
loaderSound.load('assets/respiracion.mp3',(audio) => {
    respiracionSound.setBuffer(audio);
    respiracionSound.setVolume(0.25);
    respiracionSound.play();
})

window.addEventListener('keydown',(evt)=> {
    if(evt.key == "q"){
        if(sound.isPlaying){
            sound.pause();
        }else{
            sound.play();
        }
    }
})
//musica

const clock = new THREE.Clock();

let mixer, skeleton;
let idle, walk, run;
let tpose, perriar;
let stats, settings;
let actions,raycaster;
let esqueletoModel, organosModel, pielModel;
let pulmonDer, pulmonIzq, corazon;

let singleStepMode = false;

const crossFadeControls = [];

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.2;
controls.enableZoom = true;
controls.target.set(-0.4,0.8,-0.1); 

scene.add( new THREE.HemisphereLight( 0x443333, 0x111122 ) );
				
addShadowedLight( 0.5, 1, - 1, 0xffaa00, 1 );
addShadowedLight( -3, 10, 10, 0xffffff, 1.35 );

function addShadowedLight( x, y, z, color, intensity ) {

    const directionalLight = new THREE.DirectionalLight( color, intensity );
    directionalLight.position.set( x, y, z );
    scene.add( directionalLight );

    directionalLight.castShadow = true;

    const d = 2;
    directionalLight.shadow.camera.left = - d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = - d;

    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 40;

    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;

    directionalLight.shadow.bias = - 0.001;

}

const mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 100, 100 ), new THREE.MeshPhongMaterial( { color: 0x999999, specular: 0x101010 } ));
mesh.position.set(0,-0.02,0);
mesh.rotation.x = - Math.PI / 2;
mesh.receiveShadow = true;
scene.add( mesh );

const loader = new THREE.GLTFLoader();
loader.setPath('assets/objs/testing/');
loader.load('sekeleton.1.glb', (object) => {

    esqueletoModel = object.scene;
    esqueletoModel.scale.setScalar(0.025);
    scene.add(esqueletoModel);
    
    esqueletoModel.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            //child.receiveShadow = true;
        }
    });

    esqueletoModel.position.set(0,0,0);
    createPanel();


});

loader.load('organos con animaciones.glb', (object) => {

    organosModel = object.scene;
    organosModel.scale.setScalar(0.025)
    scene.add(organosModel);
    

    organosModel.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            //child.receiveShadow = true;
        }
    });

    
    mixer = new THREE.AnimationMixer(organosModel);

    const animations = object.animations;
    mixer.timeScale = 4.0;
    console.log(animations);
    pulmonDer = mixer.clipAction(animations[1]);
    pulmonIzq = mixer.clipAction(animations[2]);
    corazon = mixer.clipAction(animations[0]);

    pulmonDer.timeScale = 0.5;
    pulmonIzq.timeScale = 0.5;

    corazon.play();
    pulmonIzq.play();
    pulmonDer.play(); 

    organosModel.position.set(0,0,0);
});

raycaster = new THREE.Raycaster();

//FPS:
stats = new Stats();
document.body.appendChild(stats.dom);
//document.addEventListener( 'mousemove', onDocumentMouseMove, false );
document.addEventListener('click', e => raycast(e));
document.addEventListener('touchend', e => raycast(e, true));

var animate = function () {
    requestAnimationFrame(animate);
    controls.update();
    const delta = clock.getDelta();
    if ( mixer ) mixer.update( delta );
    //FPS:
    stats.update();

    renderer.render(scene, camera);
};
animate();

function createPanel(){
    const panel = new dat.GUI({width: 300});

    const folder1 = panel.addFolder("Visión");
    const folder2 = panel.addFolder("Animaciones");
    const folder3 = panel.addFolder("Velocidad");
    const folder4 = panel.addFolder("Reparar");
    
    settings = {
        'Mostrar esqueleto': true,
        'Mostrar organos': true,
        'Mostrar piel': true,
        'Pausar/Continuar': pauseContinue,
        'Corazón':function(){
            flagCorazon = !flagCorazon;
            //prepareCrossFade(walk, idle, 1.0);
            if(flagCorazon){
                corazon.paused = false;
                corazonSound.play();
            }
            else{
                corazon.paused = true;
                corazonSound.stop();
            }
        },
        'Pulmones':function(){
            flagPulmon = !flagPulmon;

            if(flagPulmon){
                pulmonDer.paused = false;
                pulmonIzq.paused = false;
                respiracionSound.play();
            }else{
                pulmonDer.paused = true;
                pulmonIzq.paused = true;
                respiracionSound.stop();
            }
        },
        'Modificar velocidad de animacion': 4.0,
        'Arreglar': function(){
            flag = false;
        }
    }

    folder1.add(settings, 'Mostrar esqueleto').onChange((visibility) => {
        if(!visibility)
            esqueletoModel.position.set(-0.25,0,100);
        else
            esqueletoModel.position.set(0,0,0);
        esqueletoModel.visible = visibility;
    });
    folder1.add(settings, 'Mostrar organos').onChange((visibility) => {
        if(!visibility)
            organosModel.position.set(-0.25,0,100);
        else
            organosModel.position.set(0,0,0);
        organosModel.visible = visibility;
    });
    /* folder1.add(settings, 'Mostrar piel').onChange((visibility) => {
        if(!visibility)
            pielModel.position.set(-0.25,0,100);
        else
            pielModel.position.set(0,0,0);
        pielModel.visible = visibility;
    }); */

    crossFadeControls.push(folder2.add(settings, 'Corazón'));
    crossFadeControls.push(folder2.add(settings, 'Pulmones'));

    folder3.add( settings, 'Modificar velocidad de animacion', 0.0, 5.0, 0.01 ).onChange( modifyTimeScale );
    folder4.add( settings, 'Arreglar');

    folder1.open();
    folder2.open();
    folder3.open();
    folder4.open();
}

function modifyTimeScale(speed){
    mixer.timeScale = speed;
}

function pauseContinue(){
    if(singleStepMode){
        singleStepMode = false;
        unPauseAllActions();
    }
    else{
        if(idle.paused){
            unPauseAllActions();
        }
        else{
            pauseAllActions();
        }
    }
}

function pauseAllActions(){
    actions.forEach((action) => {
        action.paused = true;
    })
}

function unPauseAllActions() {
    actions.forEach((action) => {
        action.paused = false;
    });
}

function prepareCrossFade( startAction, endAction, defaultDuration ) {

    const duration = defaultDuration;

    singleStepMode = false;
    unPauseAllActions();

    if ( startAction === idle ) {
        executeCrossFade( startAction, endAction, duration );
    } else {
        synchronizeCrossFade( startAction, endAction, duration );
    }
}

function executeCrossFade( startAction, endAction, duration ) {

    setWeight( endAction, 1 );
    endAction.time = 0;

    startAction.crossFadeTo( endAction, duration, true );

}

function synchronizeCrossFade( startAction, endAction, duration ) {

    mixer.addEventListener( 'loop', onLoopFinished );

    function onLoopFinished( event ) {
        if ( event.action === startAction ) {
            mixer.removeEventListener( 'loop', onLoopFinished );
            executeCrossFade( startAction, endAction, duration );
        }
    }
}

function setWeight( action, weight ) {

    action.enabled = true;
    action.setEffectiveTimeScale( 1 );
    action.setEffectiveWeight( weight );

}

function activateAllActions() {

    setWeight( idle, 1.0 );
    setWeight( walk, 0.0 );
    setWeight( run, 0.0 );
    setWeight( perriar, 0.0 );
    setWeight( tpose, 0.0 );

    actions.forEach( function ( action ) {

        action.play();

    } );

}

function onDocumentMouseMove( event ) {
    var mouse = {};
    mouse.x = 2 * (event.clientX / window.innerWidth) - 1;
    mouse.y = 1 - 2 * (event.clientY / window.innerHeight);
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects[0]) {
      var object = intersects[0].object;
  
      if (object.name === 'stacy') {
        object.material.color.set( 0xffffff);
      }
    }
}

let flag = false;

function raycast(e, touch = false) {
    var mouse = {};
    if (touch) {
      mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
    } else {
      mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
    }
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects[0]) {
    
      var object = intersects[0].object;
      let model1 = object.name.charAt(0);
      console.log(object);
      console.log(controls.quatertion);
      //object.visible = false;
      if(!flag){
        flag = true;
        switch(model1){
            case '1':
                for(let i = 0; i < esqueleto["Esqueleto"].length; i++){
                    if(esqueleto["Esqueleto"][i].Id === object.name){
                        escribir(esqueleto["Esqueleto"][i].Nombre,esqueleto["Esqueleto"][i].Info,esqueleto["Esqueleto"][i].Nombre.length,esqueleto["Esqueleto"][i].Info.length);
                        camera.lookAt(object.position);
                        imagen(esqueleto["Esqueleto"][i].Img);
                        break;
                    }
                }
                break;
            case '2':
                for(let i = 0; i < organos["Organos"].length; i++){
                    if(organos["Organos"][i].Id === object.name){
                        escribir(organos["Organos"][i].Nombre,organos["Organos"][i].Info,organos["Organos"][i].Nombre.length,organos["Organos"][i].Info.length);
                        imagen(organos["Organos"][i].Img);
                        break;
                    }
                }
                break;
            case '3':
                for(let i = 0; i < cuerpo["Cuerpo"].length; i++){
                    if(cuerpo["Cuerpo"][i].Id === object.name){
                        escribir(cuerpo["Cuerpo"][i].Nombre,cuerpo["Cuerpo"][i].Info,cuerpo["Cuerpo"][i].Nombre.length,cuerpo["Cuerpo"][i].Info.length);
                        imagen(cuerpo["Cuerpo"][i].Img);
                        break;
                    }
                }
                break;
            default:
                console.log("ERROR");
                flag = false;
                break;
        }
      }
    }
}


    
async function escribir(titulo,info,num1,num2){
    let wait = 20;
    if(info && titulo){
        console.log("hola " + info);
    let h2 = document.createElement('h2');
    let h1 = document.createElement('h1');
    document.getElementById('info').innerHTML = "";
    document.getElementById('info').appendChild(h1);
    document.getElementById('info').appendChild(h2);
    
    for(i = 0; i < num1; i++) {
        h1.innerHTML += titulo.charAt(i);
         await sleep(wait*2);
     }
    for(i = 0; i < num2; i++) {
       h2.innerHTML += info.charAt(i);
        await sleep(wait);
    }
    flag = false;
    }
    else{
        console.log("Error");
        flag = false;
    }
}

function imagen(src){
    let img = document.createElement('img');
    img.src = src;
    img.className = "info-img";
    document.body.appendChild(img);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function a(model){
    let x = model.children.length;
    for(let i = 0; i < x; i++){
        console.log(model.children[i].name);
    }
}