var scene = new THREE.Scene();
scene.background = new THREE.Color( 0x00000 );
scene.fog = new THREE.Fog( 0xa0a0a0, 10, 50 );

var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );

//#region CAMERA SETTINGS
camera.position.set( 0, 1.3, 3 );
camera.lookAt( 0, 1, 0 );
//#endregion

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
var loaderSound = new THREE.AudioLoader().load('assets/bailan-rochas-y-chetas.mp3',(audio) => {
    sound.setBuffer(audio);
    sound.setVolume(0.25);
    sound.play();
});

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

let singleStepMode = false;

const crossFadeControls = [];

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;
controls.target.set(-0.4,0.8,-0.1); 

const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
hemiLight.position.set( 0, 20, 0 );

const dirLight = new THREE.DirectionalLight( 0xffffff );
dirLight.position.set( - 3, 10, - 10 );
dirLight.castShadow = true;
dirLight.shadow.camera.top = 2;
dirLight.shadow.camera.bottom = - 2;
dirLight.shadow.camera.left = - 2;
dirLight.shadow.camera.right = 2;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 40;

scene.add(dirLight);
scene.add(hemiLight);

const mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 100, 100 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
mesh.rotation.x = - Math.PI / 2;
mesh.receiveShadow = true;
//scene.add( mesh );

const pmremGenerator = new THREE.PMREMGenerator( renderer );
pmremGenerator.compileEquirectangularShader();

const model_click = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb';

new THREE.RGBELoader()
    .setDataType( THREE.UnsignedByteType )
    .setPath( 'assets/objs/testing/fondo/' )
    .load( '360-Hotel-World-Trade-Center-Barcelona-01.hdr', function ( texture ) {

        const envMap = pmremGenerator.fromEquirectangular( texture ).texture;

        scene.background = envMap;
        scene.environment = envMap;

        texture.dispose();
        pmremGenerator.dispose();

        animate();

        // model

        
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

    mixer = new THREE.AnimationMixer(esqueletoModel);

    const animations = object.animations;
    console.log(animations);
    idle = mixer.clipAction(animations[0]);
    idle.play();
    /* idle = mixer.clipAction(animations[2]);
    walk = mixer.clipAction(animations[1]);
    run = mixer.clipAction(animations[3]);
    perriar = mixer.clipAction(animations[0]);
    tpose = mixer.clipAction(animations[4]);

    actions = [idle,walk,run,perriar,tpose]; 

    activateAllActions(); */

});

/////////////////////////////////////////////////////////////////////////////////////

loader.load('organosConTexturas.glb', (object) => {

    organosModel = object.scene;
    organosModel.scale.setScalar(0.025)
    scene.add(organosModel);
    

    organosModel.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            //child.receiveShadow = true;
        }
    });

    //posicion:
    organosModel.position.set(0,0,0);

});

/*
 loader.load('Character.glb', (object) => {

    pielModel = object.scene;
    pielModel.scale.setScalar(0.025)
    scene.add(pielModel);
    

    pielModel.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            //child.receiveShadow = true;
        }
    });

    //posicion:
    pielModel.position.set(0,0,0);

}); */

//////////////////////////////////////////////////////////////////////////////////////


    } );

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
    
    settings = {
        'Mostrar esqueleto': true,
        'Mostrar organos': true,
        'Mostrar piel': true,
        'Pausar/Continuar': pauseContinue,
        'De caminar a parado':function(){
            prepareCrossFade(walk, idle, 1.0);
        },
        'De parado a caminar':function(){
            prepareCrossFade(idle, walk, 0.5);
        },
        'De caminar a correr': function(){
            prepareCrossFade(walk, run, 5.0);
        },
        'De correr a caminar': function(){
            prepareCrossFade(run, walk, 5.0);
        },
        'Modificar velocidad de animacion': 1.0
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
    folder1.add(settings, 'Mostrar piel').onChange((visibility) => {
        if(!visibility)
            pielModel.position.set(-0.25,0,100);
        else
            pielModel.position.set(0,0,0);
        pielModel.visible = visibility;
    });

    crossFadeControls.push(folder2.add(settings, 'De caminar a parado'));
    crossFadeControls.push(folder2.add(settings, 'De parado a caminar'));
    crossFadeControls.push(folder2.add(settings, 'De caminar a correr'));
    crossFadeControls.push(folder2.add(settings, 'De correr a caminar'));
    folder3.add( settings, 'Modificar velocidad de animacion', 0.0, 1.5, 0.01 ).onChange( modifyTimeScale );

    folder1.open();
    folder2.open();
    folder3.open();
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
    document.getElementById('info-img').src = src;
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