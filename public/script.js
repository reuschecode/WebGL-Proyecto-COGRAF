var scene = new THREE.Scene();
scene.background = new THREE.Color( 0xa0a0a0 );
scene.fog = new THREE.Fog( 0xa0a0a0, 10, 50 );

var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );

//#region CAMERA SETTINGS
camera.position.set( 2.25, 1.3, 3 );
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
})

const clock = new THREE.Clock();

let mixer, skeleton;
let idle, walk, run;
let tpose, perriar;
let stats, settings;
let model,actions;

let singleStepMode = false;

const crossFadeControls = [];

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;
controls.target.set(0.2,0.6,-0.1);

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
scene.add( mesh );

const loader = new THREE.GLTFLoader();
loader.setPath('assets/objs/testing/');
loader.load('Character.glb', (object) => {

    model = object.scene;
    scene.add(model);
    
    model.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            //child.receiveShadow = true;
        }
    });

    //posicion:
    //model.position.set(0,-1,0);
    //Panel:

    createPanel();

    //#region Esqueleto:
    skeleton = new THREE.SkeletonHelper(model);
    skeleton.visible = false;
    scene.add(skeleton);
    //#endregion

    mixer = new THREE.AnimationMixer(model);

    const animations = object.animations;
    console.log(animations);
    idle = mixer.clipAction(animations[2]);
    walk = mixer.clipAction(animations[1]);
    run = mixer.clipAction(animations[3]);
    perriar = mixer.clipAction(animations[0]);
    tpose = mixer.clipAction(animations[4]);

    actions = [idle,walk,run,perriar,tpose];

    activateAllActions();

});

//FPS:
stats = new Stats();
document.body.appendChild(stats.dom);

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
        'Mostrar modelo': true,
        'Mostrar esqueleto': false,
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

    folder1.add(settings, 'Mostrar modelo').onChange((visibility) => {
        model.visible = visibility
    });
    folder1.add(settings, 'Mostrar esqueleto').onChange((visibility)=>{
        skeleton.visible = visibility;
    })
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