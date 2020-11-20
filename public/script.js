var scene = new THREE.Scene();
scene.background = new THREE.Color( 0xFFFFBF );

var camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);

//#region CAMERA SETTINGS
camera.position.set(15,130,150);
camera.lookAt(-0.16,-0.02,-0.003);
//#endregion

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
})

const clock = new THREE.Clock();

let mixer, skeleton;
let idle, walk, run;
let stats, settings;
let model, actions;

let singleStepMode = false;

const crossFadeControls = [];

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

var keyLight = new THREE.DirectionalLight(new THREE.Color('hsl(30, 100%, 75%)'), 1.0);
keyLight.position.set(-100, 0, 100);

var fillLight = new THREE.DirectionalLight(new THREE.Color('hsl(240, 100%, 75%)'), 0.75);
fillLight.position.set(100, 0, 100);

var backLight = new THREE.DirectionalLight(0xffffff, 1.0);
backLight.position.set(100, 0, -100).normalize();

/*
const mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 1000, 1000 ), new THREE.MeshPhongMaterial( { color: 0x3b83bd, depthWrite: true } ) );
mesh.rotation.x = - Math.PI / 2;
mesh.receiveShadow = true;
*/

//scene.add( mesh );

scene.add(keyLight);
scene.add(fillLight);
scene.add(backLight);

const loader = new THREE.FBXLoader();
loader.load('assets/objs/testing/Rumba_Dancing.fbx', function (object) {
    
    model = object;
    mixer = new THREE.AnimationMixer(model);

    idle = mixer.clipAction(model.animations[0]);
    //walk = mixer.clipAction(object.animations[1]);
    //run = mixer.clipAction(object.animations[2]);

    //actions = [idle,walk,run];

    idle.play();
    model.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    //posicion:
    model.position.set(0,-75,0);

    //Panel:

    createPanel();

    const animations = object.animations;
    console.log(animations);

    //#region Esqueleto:
    skeleton = new THREE.SkeletonHelper(model);
    skeleton.visible = false;
    scene.add(skeleton);
    //#endregion

    scene.add(model);
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

    console.log(panel);
    const folder1 = panel.addFolder("Visión");
    const folder2 = panel.addFolder("Animaciones");

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
            prepareCrossFade(walk, run, 2.5);
        },
        'De correr a caminar': function(){
            prepareCrossFade(run, idle, 5.0);
        }
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

    if ( startAction === idleAction ) {
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