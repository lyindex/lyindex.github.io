const Colors = {
    red: 0xc62828,
    white: 0xf5f5f5,
    brown: 0x4e342e,
    pink: 0xf5986e,
    brownDark: 0x4e342e,
    blue: 0x68c3c0,
    gray: 0x616161,
};

const url = {
    HOME: 'www.liuyu.in',
    BLOG: 'blog.liuyu.in',
    PAST: '#',
    // ABOUT: ''
};

const mousePos = new THREE.Vector2();

let urlBox = [];

let scene, camera, raycaster, fieldOfView, aspectRatio, nearPlane,
    farPlane, HEIGHT, WIDTH, renderer, container, fontGeo,
    hemisphereLight, shadowLight,
    sea, skyFront, skyBack, airplane, messageBoard, go;

const model = {
    init() {
        this.createScene();
        this.createLights();
        this.createPlane();
        this.createSea();
        // this.createFish();
        this.createSky();
        this.createMessageBoard();
        this.createFont(() => {
            this.createUrl();
            this.createMessage().init("INIT");
            this.createGo();
            this.loop();
        });
    },
    createScene() {
        HEIGHT = window.innerHeight;
        WIDTH = window.innerWidth;

        // 创建场景
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

        // 创建相机
        aspectRatio = WIDTH / HEIGHT;
        fieldOfView = 60;
        nearPlane = 1;
        farPlane = 10000;
        camera = new THREE.PerspectiveCamera(
            fieldOfView,
            aspectRatio,
            nearPlane,
            farPlane
        );

        camera.position.x = 0;
        camera.position.z = 200;
        camera.position.y = 100;
        camera.userData.active = false;
        // scene.add(camera);

        // 创建渲染器
        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        renderer.setSize(WIDTH, HEIGHT);
        renderer.shadowMap.enabled = true;
        renderer.setPixelRatio( window.devicePixelRatio );
        container = document.getElementById('world');
        container.appendChild(renderer.domElement);

        // 射线
        raycaster = new THREE.Raycaster();

        // 监听屏幕，缩放屏幕更新相机和渲染器的尺寸
        window.addEventListener('resize', this.handleWindowResize, false);
    },
    handleWindowResize() {
        // 更新渲染器的高度和宽度以及相机的纵横比
        HEIGHT = window.innerHeight;
        WIDTH = window.innerWidth;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
    },
    createLights() {
        // 半球光
        hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);

        // 平行光
        shadowLight = new THREE.DirectionalLight(0xffffff, .9);
        shadowLight.position.set(150, 350, 350);
        shadowLight.castShadow = true;
        shadowLight.shadow.camera.left = -400;
        shadowLight.shadow.camera.right = 400;
        shadowLight.shadow.camera.top = 400;
        shadowLight.shadow.camera.bottom = -400;
        shadowLight.shadow.camera.near = 1;
        shadowLight.shadow.camera.far = 1000;
        shadowLight.shadow.mapSize.width = 2048;
        shadowLight.shadow.mapSize.height = 2048;

        // 环境光
        ambientLight = new THREE.AmbientLight(0xdc8874, .5);

        scene.add(hemisphereLight);
        scene.add(shadowLight);
        scene.add(ambientLight);
    },
    createSea() {
        // 创建一个圆柱几何体
        const Sea = function () {
            const geom = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
            geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

            // 合并顶点，确保海浪的连续性
            geom.mergeVertices();

            // 获得顶点
            const l = geom.vertices.length;

            // 创建一个储存鱼的数组
            this.fishes = [];

            // 创建一个新的数组存储与每个顶点关联的值：
            this.waves = [];

            for (let i = 0; i < l; i++) {
                // 获取每个顶点
                const v = geom.vertices[i];

                // 存储一些关联的数值
                this.waves.push({
                    y: v.y,
                    x: v.x,
                    z: v.z,
                    // 随机角度
                    ang: Math.random() * Math.PI * 2,
                    // 随机距离
                    amp: 5 + Math.random() * 15,
                    // 在0.016至0.048度/帧之间的随机速度
                    speed: 0.016 + Math.random() * 0.032
                });
            };

            // 创建材质
            const mat = new THREE.MeshPhongMaterial({
                color: Colors.blue,
                transparent: true,
                opacity: .8,
                shading: THREE.FlatShading,
            });

            this.mesh = new THREE.Mesh(geom, mat);
            this.mesh.name = "sea";
            // this.mesh.userData.interactive = true;
            this.mesh.receiveShadow = true;
        };

        Sea.prototype.moveWaves = function () {

            // 获取顶点
            const verts = this.mesh.geometry.vertices;
            for (let i = 0; i < verts.length; i++) {
                const v = verts[i];
                // 获取关联的值
                const vprops = this.waves[i];

                // 更新顶点的位置
                v.x = vprops.x + Math.cos(vprops.ang) * vprops.amp;
                v.y = vprops.y + Math.sin(vprops.ang) * vprops.amp;

                // 下一帧自增一个角度
                vprops.ang += vprops.speed;
            }

            // 强制更新顶点信息
            this.mesh.geometry.verticesNeedUpdate = true;

            sea.mesh.rotation.z += .005;
        }

        sea = new Sea();
        sea.mesh.position.y = -600;
        scene.add(sea.mesh);

    },
    createFish() {
        const Fish = function() {
            this.mesh = new THREE.Object3D();

            // 身体
            const bodyGeo = new THREE.BoxGeometry( 8, 8, 8 );
            const bodyMtl = new THREE.MeshPhongMaterial({
                color: Colors.gray,
            });
            const body = new THREE.Mesh( bodyGeo, bodyMtl );
            body.castShadow = true;
            body.receiveShadow = true;
            this.mesh.add(body);

            // 眼睛
            const eyes = new THREE.Object3D();
            const eyeOutsideGeo = new THREE.BoxGeometry( 8.5, 1.2, 1.2 );
            const eyeOutsideMtl = new THREE.MeshPhongMaterial({
                color: 0xc4de6f,
            });
            const eyeOutside = new THREE.Mesh( eyeOutsideGeo, eyeOutsideMtl );
            const eyeInsideGeo = new THREE.BoxGeometry( 8.6, 0.8, 0.8 );
            const eyeInsideMtl = new THREE.MeshPhongMaterial({
                color: 0x0f3245,
            });
            const eyeInside = new THREE.Mesh( eyeInsideGeo, eyeInsideMtl );
            eyes.add(eyeOutside, eyeInside);
            eyes.position.set( 0, 2.2, 2.2 )
            eyes.castShadow = true;
            eyes.receiveShadow = true;
            this.mesh.add(eyes);

            //嘴
            const mouthGeo = new THREE.BoxGeometry( 3.2, 1.5, 1.5 );
            const mouthMtl = new THREE.MeshPhongMaterial({
                color: 0xfa9db6,
            });
            const mouth = new THREE.Mesh( mouthGeo, mouthMtl );
            mouth.position.set( 0, -2, 3.8 );
            mouth.castShadow = true;
            mouth.receiveShadow = true;
            this.mesh.add(mouth);

            // 侧边鱼鳍
            const sideFinGeo = new THREE.BoxGeometry( 6, 3, 1 );
            const sideFinMtl = new THREE.MeshPhongMaterial({
                color: Colors.gray,
            });
            this.sideFinL = new THREE.Mesh( sideFinGeo, sideFinMtl );
            this.sideFinR = new THREE.Mesh( sideFinGeo, sideFinMtl );
            this.sideFinL.castShadow = true;
            this.sideFinR.castShadow = true;
            this.sideFinL.receiveShadow = true;
            this.sideFinR.receiveShadow = true;
            this.sideFinL.translateX(3);
            this.sideFinL.translateY(-1);
            this.sideFinL.translateZ(-1);
            this.sideFinR.translateX(-3);
            this.sideFinR.translateY(-1);
            this.sideFinR.translateZ(-1);
            this.mesh.add(this.sideFinL, this.sideFinR);

            // 背部鱼鳍
            this.backFin = new THREE.Object3D();
            const backFinTGeo = new THREE.BoxGeometry( 1, 3, 3 );
            const backFinTMtl = new THREE.MeshPhongMaterial({
                color: Colors.gray,
            });
            const backFinT = new THREE.Mesh( backFinTGeo, backFinTMtl );
            backFinT.castShadow = true;
            backFinT.receiveShadow = true;
            const backFinBGeo = new THREE.BoxGeometry( 1, 1.4, 4 );
            const backFinBMtl = new THREE.MeshPhongMaterial({
                color: Colors.gray,
            });
            const backFinB = new THREE.Mesh( backFinBGeo, backFinBMtl );
            backFinB.castShadow = true;
            backFinB.receiveShadow = true;
            backFinB.position.set(0, 1.5, -0.5)
            this.backFin.add(backFinT, backFinB);
            this.backFin.translateZ(-1);
            this.backFin.translateY(4);
            this.mesh.add(this.backFin);

            // 尾部
            this.tail = new THREE.Object3D();

            const tailSingleGeo = new THREE.BoxGeometry( 1, 2, 3 );
            const tailSingleMtl = new THREE.MeshPhongMaterial({
                color: Colors.gray,
            });
            const tailSideT = new THREE.Mesh(tailSingleGeo, tailSingleMtl);
            const tailSideB = new THREE.Mesh(tailSingleGeo, tailSingleMtl);
            const tailMid = new THREE.Mesh(tailSingleGeo, tailSingleMtl);
            tailSideT.position.set(0, 1.2, -2);
            tailSideB.position.set(0, -1.2, -2);
            tailSideT.castShadow = true;
            tailSideT.receiveShadow = true;
            tailSideB.castShadow = true;
            tailSideB.receiveShadow = true;
            tailMid.castShadow = true;
            tailMid.receiveShadow = true;
            this.tail.add( tailSideT, tailSideB , tailMid);

            this.tail.translateZ(-4.2);
            // this.mesh.scale.set(.5, .5, .5);
            // this.mesh.rotation.y = - Math.PI / 2;
            this.mesh.add(this.tail);
            
        };

        Fish.prototype.finMove = function() {
            let timer = Date.now() * 0.01;
            // this.sideFinL.rotateY(Math.PI/12);
            this.sideFinL.rotation.y = Math.sin(timer) * Math.PI / 12;
            this.sideFinR.rotation.y = Math.sin(timer) * Math.PI / -12;
            this.backFin.rotation.z = Math.sin(timer) * Math.PI / 12;
            this.tail.rotation.y = Math.sin(timer) * Math.PI / 6;
            // this.sideFinR.rotateY(-Math.PI/12);
        };

        // 鱼的数量
        const fishNum = 30;
        const stepAngle = Math.PI * 2 / fishNum;
        for (let i=0; i<fishNum; i++) {
            const fish = new Fish();
            const a = stepAngle * i;
            const h = 580;
            fish.mesh.position.y = Math.sin(a) * h;
            fish.mesh.position.x = Math.cos(a) * h;
            fish.mesh.rotation.z = Math.PI / 2;
            fish.mesh.position.z = -300 + Math.random() * 600;
            const s = Math.random() * 2;
            fish.mesh.scale.set(s, s, s);
            sea.fishes.push(fish);
            sea.mesh.add(fish.mesh);
        }
    },
    createSky() {
        //构造云
        const Cloud = function () {
            this.mesh = new THREE.Object3D();
            const geom = new THREE.BoxGeometry(20, 20, 20);
            const mat = new THREE.MeshPhongMaterial({
                color: Colors.white,
            });

            // 随机多次复制几何体
            const nBlocs = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < nBlocs; i++) {

                // 通过复制几何体创建网格
                const m = new THREE.Mesh(geom, mat);

                // 随机设置每个正方体的位置和旋转角度
                m.position.x = i * 15;
                m.position.y = Math.random() * 10;
                m.position.z = Math.random() * 10;
                m.rotation.z = Math.random() * Math.PI * 2;
                m.rotation.y = Math.random() * Math.PI * 2;

                // 随机设置正方体的大小
                const s = .1 + Math.random() * .9;
                m.scale.set(s, s, s);

                // 允许每个正方体生成投影和接收阴影
                m.castShadow = true;
                m.receiveShadow = true;

                // 将正方体添加至开始时我们创建的容器中
                this.mesh.add(m);
            }
        }

        //构造天空
        const Sky = function (depth) {
            this.mesh = new THREE.Object3D();

            // 选取若干朵云散布在天空中
            this.nClouds = 20;

            // 把云均匀地散布
            const stepAngle = Math.PI * 2 / this.nClouds;

            // 创建云对象
            for (let i = 0; i < this.nClouds; i++) {
                const c = new Cloud();

                // 设置每朵云的旋转角度和位置
                const a = stepAngle * i; //云的最终角度
                const h = 750 + Math.random() * 200; // 轴的中心和云本身之间的距离
                c.mesh.position.y = Math.sin(a) * h;
                c.mesh.position.x = Math.cos(a) * h;

                // 根据云的位置旋转它
                c.mesh.rotation.z = a + Math.PI / 2;

                // 放置云在场景中的随机深度位置
                c.mesh.position.z = -depth - Math.random() * depth;

                // 缩放每朵云为随机大小
                const s = 1 + Math.random() * 2;
                c.mesh.scale.set(s, s, s);

                this.mesh.name = "sky";
                this.mesh.add(c.mesh);
            }
        }

        skyFront = new Sky(400);
        skyBack = new Sky(-400);
        skyFront.mesh.position.y = -600;
        skyBack.mesh.position.y = -600;
        scene.add(skyFront.mesh);
        scene.add(skyBack.mesh);
    },
    createPlane() {

        const AirPlane = function () {
            this.mesh = new THREE.Object3D();

            // 驾驶舱
            const geomCockpit = new THREE.BoxGeometry(80, 50, 50, 1, 1, 1);
            geomCockpit.vertices[4].y -= 10;
            geomCockpit.vertices[4].z += 20;
            geomCockpit.vertices[5].y -= 10;
            geomCockpit.vertices[5].z -= 20;
            geomCockpit.vertices[6].y += 30;
            geomCockpit.vertices[6].z += 20;
            geomCockpit.vertices[7].y += 30;
            geomCockpit.vertices[7].z -= 20;

            const matCockpit = new THREE.MeshPhongMaterial({
                color: Colors.red,
                shading: THREE.FlatShading
            });
            const cockpit = new THREE.Mesh(geomCockpit, matCockpit);
            cockpit.castShadow = true;
            cockpit.receiveShadow = true;
            this.mesh.add(cockpit);

            // 引擎
            const geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
            const matEngine = new THREE.MeshPhongMaterial({
                color: Colors.white,
                shading: THREE.FlatShading
            });
            const engine = new THREE.Mesh(geomEngine, matEngine);
            engine.position.x = 40;
            engine.castShadow = true;
            engine.receiveShadow = true;
            this.mesh.add(engine);

            // 机尾
            const geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
            const matTailPlane = new THREE.MeshPhongMaterial({
                color: Colors.red,
                shading: THREE.FlatShading
            });
            const tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
            tailPlane.position.set(-35, 25, 0);
            tailPlane.castShadow = true;
            tailPlane.receiveShadow = true;
            this.mesh.add(tailPlane);

            // 机翼
            const geomWing = new THREE.BoxGeometry(40, 8, 130, 1, 1, 1);
            const matWing = new THREE.MeshPhongMaterial({
                color: Colors.red,
                shading: THREE.FlatShading
            });
            const wing = new THREE.Mesh(geomWing, matWing);
            wing.castShadow = true;
            wing.receiveShadow = true;
            this.mesh.add(wing);

            // 变形机翼
            const SideWing = function() {
                this.mesh = new THREE.Object3D();
                const geomSideWingL = new THREE.BoxGeometry(40, 8, 5);
                // geomSideWingL.vertices[5].x -= 20;
                // geomSideWingL.vertices[5].y += 40;
                // geomSideWingL.vertices[5].z += 30;
                const geomSideWingR = new THREE.BoxGeometry(40, 8, 5);
                // geomSideWingR.vertices[4].x -= 20;
                // geomSideWingR.vertices[4].y += 40;
                // geomSideWingR.vertices[4].z -= 30;
                const matSideWing = new THREE.MeshPhongMaterial({
                    color: 0x000000,
                    shading: THREE.FlatShading
                });
                this.sideWingL = new THREE.Mesh(geomSideWingL, matSideWing);
                this.sideWingR = new THREE.Mesh(geomSideWingR, matSideWing);
        
                this.sideWingL.castShadow = true;
                this.sideWingL.receiveShadow = true;
                this.sideWingL.position.z = 67.5;
                this.sideWingR.position.z = -67.5;

                this.mesh.add(this.sideWingL, this.sideWingR);
                this.mesh.userData.active = false;
            };

            SideWing.prototype.transform = function() {
                if ( this.mesh.userData.active ) {
                    this.sideWingL.geometry.vertices[5].x += ( -40 - this.sideWingL.geometry.vertices[5].x ) * 0.08;
                    this.sideWingL.geometry.vertices[5].y += ( 44 - this.sideWingL.geometry.vertices[5].y ) * 0.08;
                    this.sideWingL.geometry.vertices[5].z += ( 32.5 - this.sideWingL.geometry.vertices[5].z ) * 0.08;

                    this.sideWingR.geometry.vertices[4].x += ( -40 - this.sideWingR.geometry.vertices[4].x ) * 0.08;
                    this.sideWingR.geometry.vertices[4].y += ( 44 - this.sideWingR.geometry.vertices[4].y ) * 0.08;
                    this.sideWingR.geometry.vertices[4].z += ( -32.5 - this.sideWingR.geometry.vertices[4].z ) * 0.08;
                } else {
                    this.sideWingL.geometry.vertices[5].x += ( -20 - this.sideWingL.geometry.vertices[5].x ) * 0.02;
                    this.sideWingL.geometry.vertices[5].y += ( 4 - this.sideWingL.geometry.vertices[5].y ) * 0.02;
                    this.sideWingL.geometry.vertices[5].z += ( 2.5 - this.sideWingL.geometry.vertices[5].z ) * 0.02;

                    this.sideWingR.geometry.vertices[4].x += ( -20 - this.sideWingR.geometry.vertices[4].x ) * 0.02;
                    this.sideWingR.geometry.vertices[4].y += ( 4 - this.sideWingR.geometry.vertices[4].y ) * 0.02;
                    this.sideWingR.geometry.vertices[4].z += ( -2.5 - this.sideWingR.geometry.vertices[4].z ) * 0.02;
                }
                this.sideWingL.geometry.verticesNeedUpdate = true;
                this.sideWingR.geometry.verticesNeedUpdate = true;
            };

            this.sideWing = new SideWing();
            this.mesh.add(this.sideWing.mesh);

            // 螺旋桨连接杆
            const geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
            const matPropeller = new THREE.MeshPhongMaterial({
                color: Colors.brown,
                shading: THREE.FlatShading
            });
            this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
            this.propeller.castShadow = true;
            this.propeller.receiveShadow = true;

            // 螺旋桨扇叶
            const geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
            const matBlade = new THREE.MeshPhongMaterial({
                color: Colors.brownDark,
                shading: THREE.FlatShading
            });
            const blade = new THREE.Mesh(geomBlade, matBlade);
            blade.position.set(8, 0, 0);
            blade.castShadow = true;
            blade.receiveShadow = true;
            this.propeller.add(blade);
            this.propeller.position.set(50, 0, 0);
            this.propeller.userData.active = false;
            this.mesh.add(this.propeller);

            //飞行员
            const Pilot = function () {
                this.mesh = new THREE.Object3D();
                this.mesh.name = "pilot";

                // 头发动画角度, 用于updateHairs
                this.angleHairs = 0;

                // 身体
                const bodyGeom = new THREE.BoxGeometry(15, 15, 15);
                const bodyMat = new THREE.MeshPhongMaterial({ color: Colors.brown, shading: THREE.FlatShading });
                const body = new THREE.Mesh(bodyGeom, bodyMat);
                body.name = "body";
                body.position.set(2, -12, 0);
                this.mesh.add(body);

                // 脸部
                const faceGeom = new THREE.BoxGeometry(10, 10, 10);
                const faceMat = new THREE.MeshLambertMaterial({ color: Colors.pink });
                const face = new THREE.Mesh(faceGeom, faceMat);
                face.name = "face";
                this.mesh.add(face);

                // 单块头发
                const hairGeom = new THREE.BoxGeometry(4, 4, 4);
                const hairMat = new THREE.MeshLambertMaterial({ color: Colors.brown });
                const hair = new THREE.Mesh(hairGeom, hairMat);
                // 调整头发的形状至底部的边界，这将使它更容易扩展。
                hair.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 2, 0));
                hair.name = "hair";

                // 整个头发
                const hairs = new THREE.Object3D();
                hairs.name = "hairs";
                // 头发顶部(动画)
                this.hairsTop = new THREE.Object3D();
                this.hairsTop.name = "hairsTop";
                // 创建头顶的头发并放置他们在一个3*4的网格中
                for (let i = 0; i < 12; i++) {
                    const h = hair.clone(); //单块头发
                    const col = i % 3;
                    const row = Math.floor(i / 3);
                    const startPosZ = -4;
                    const startPosX = -4;
                    h.position.set(startPosX + row * 4, 0, startPosZ + col * 4);
                    this.hairsTop.add(h);
                }
                hairs.add(this.hairsTop);

                // 鬓角头发
                const hairSideGeom = new THREE.BoxGeometry(12, 4, 2);
                hairSideGeom.applyMatrix(new THREE.Matrix4().makeTranslation(-6, 0, 0));
                const hairSideR = new THREE.Mesh(hairSideGeom, hairMat);
                hairSideR.name = "hairSideR";
                const hairSideL = hairSideR.clone();
                hairSideL.name = "hairSideL";
                hairSideR.position.set(8, -2, 6);
                hairSideL.position.set(8, -2, -6);
                hairs.add(hairSideR);
                hairs.add(hairSideL);

                // 后脑勺头发
                const hairBackGeom = new THREE.BoxGeometry(2, 8, 10);
                const hairBack = new THREE.Mesh(hairBackGeom, hairMat);
                hairBack.position.set(-1, -4, 0)
                hairBack.name = "hairBack";
                hairs.add(hairBack);
                hairs.position.set(-5, 5, 0);
                this.mesh.add(hairs);

                // 镜片
                const glassGeom = new THREE.BoxGeometry(5, 5, 5);
                const glassMat = new THREE.MeshLambertMaterial({ color: Colors.brown });
                const glassR = new THREE.Mesh(glassGeom, glassMat);
                glassR.position.set(6, 0, 3);
                const glassL = glassR.clone();
                glassL.position.z = -glassR.position.z;

                // 镜架
                const glassAGeom = new THREE.BoxGeometry(11, 1, 11);
                const glassA = new THREE.Mesh(glassAGeom, glassMat);
                glassR.name = "glassR";
                glassL.name = "glassL";
                glassA.name = "glassA";
                this.mesh.add(glassR);
                this.mesh.add(glassL);
                this.mesh.add(glassA);

                // 耳朵
                const earGeom = new THREE.BoxGeometry(2, 3, 2);
                const earL = new THREE.Mesh(earGeom, faceMat);
                earL.position.set(0, 0, -6);
                const earR = earL.clone();
                earR.position.set(0, 0, 6);
                earL.name = "earL";
                earR.name = "earR";
                this.mesh.add(earL);
                this.mesh.add(earR);
            }

            // 缩放头发
            Pilot.prototype.updateHairs = function () {

                // 获得头发顶部中的所有模型[数组]
                const hairs = this.hairsTop.children;
                for (let i = 0; i < hairs.length; i++) {
                    const h = hairs[i];
                    // 每块头发在y轴75%至100%之间缩放。
                    h.scale.y = .75 + Math.cos(this.angleHairs + i / 3) * .25;
                }
                // 在下一帧增加角度
                this.angleHairs += 0.16;
            }

            this.pilot = new Pilot();
            this.pilot.mesh.position.set(-10, 27, 0);
            this.mesh.name = "airplane";
            this.mesh.userData.interactive = true;
            this.mesh.add(this.pilot.mesh);

        };

        airplane = new AirPlane();
        airplane.mesh.scale.set(.25, .25, .25);
        airplane.mesh.position.y = 100;
        scene.add(airplane.mesh);
    },
    createFont(callback) {
        const fontLoader = new THREE.FontLoader();
        fontLoader.load("font/helvetiker_bold.typeface.json", function (font) {
            fontGeo = font;
            callback && callback();
        });
    },
    createUrl() {
        urlBox = new THREE.Object3D();

        const Url = function (content, link) {
            this.mesh = new THREE.Object3D();

            // 盒子
            const boxGeo = new THREE.BoxGeometry(30, 30, 30);
            const boxMtl = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: .2,
                shading: THREE.FlatShading,
            });
            const box = new THREE.Mesh(boxGeo, boxMtl);
            box.castShadow = true;
            box.receiveShadow = true;
            this.mesh.add(box);

            // 文字
            const textGeo = new THREE.TextGeometry(content, {
                font: fontGeo,
                size: 6,
                height: 2,
                curveSegments: 10
            });
            const textMtl = new THREE.MeshPhongMaterial({
                color: Colors.red,
                emissive: 0xff0000,
                shading: THREE.FlatShading
            });

            const text = new THREE.Mesh(textGeo, textMtl);
            const bounding = model.computeBounding(text);
            const scale = bounding.scale; //缩放系数
            const center = bounding.center; //居中位置
            text.scale.multiplyScalar(scale);
            text.position.set(- center.x * scale, - center.y * scale, - center.z * scale);

            this.mesh.name = "url";
            this.mesh.userData.key = content;
            this.mesh.userData.link = link;
            this.mesh.userData.interactive = true;
            this.mesh.userData.active = true;
            this.mesh.add(text);
        }

        Url.prototype.rotate = function () {
            if (this.mesh.userData.active) {
                this.mesh.rotation.x += 0.01;
                this.mesh.rotation.z -= 0.01;
            } else {
                this.mesh.rotation.x += ( 0 - this.mesh.rotation.x ) * 0.1;
                this.mesh.rotation.z -= 0.01;
            }
        };

        urlBox = [];
        airplane.boxContainer = new THREE.Object3D();
        const iterator = Object.keys(url);
        const deg = 360 / iterator.length;
        let i = 0;
        for (let key of iterator) {
            const u = new Url(key, url[key]);
            u.mesh.position.x = 110 * Math.cos(i * deg * Math.PI / 180);
            u.mesh.position.y = 110 * Math.sin(i * deg * Math.PI / 180);
            i++;
            urlBox.push(u);
            airplane.boxContainer.add(u.mesh);
        }
        // airplane.boxContainer.position.z = 200;
        airplane.boxContainer.userData.active = true;
        airplane.mesh.add(airplane.boxContainer);
    },
    createMessageBoard() {
        const messageBoardGeo = new THREE.ExtrudeGeometry(
            this.createShape(-100, -20, 200, 50, 16, 20),
            {
                amount: 2,
                bevelEnabled: false
            }
        );
        const messageBoardMtl = new THREE.MeshPhongMaterial({
			color: 0x000000,
            transparent: true,
            opacity: .2,
            shading: THREE.FlatShading
        });
        messageBoard = new THREE.Mesh( messageBoardGeo, messageBoardMtl );
        messageBoard.rotation.y = - Math.PI / 2;
        messageBoard.scale.set(0.03, 0.03, 0.03);
        messageBoard.name = "messageBoard";
        messageBoard.userData.active = false;
        airplane.mesh.add(messageBoard);
    },
    createMessage() {
        // 文字
        const Text = function(content, size, color, offset) {
            const textGeo = new THREE.TextGeometry(content, {
                font: fontGeo,
                size: size,
                height: 2,
                curveSegments: 10
            });
            const textMtl = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                shading: THREE.FlatShading
            });
            const text = new THREE.Mesh(textGeo, textMtl);
            text.rotation.y = - Math.PI;
            text.position.x = offset;
            return text;
        };
        return {
            init(content) {
                const beforeText = new Text("Shall we go", 10, 0xffffff, 90);
                const afterText = new Text("now ?", 10, 0xffffff, -50);
                const mainText = new Text(content, 12, Colors.red, content.length * 1.5);
                beforeText.name = "before";
                afterText.name = "after";
                mainText.name = "main";
                messageBoard.add(beforeText, afterText, mainText);
            },
            change(obj) {
                const content = obj.userData.key;
                const link = obj.userData.link;
                const before = messageBoard.getObjectByName("before");
                const after = messageBoard.getObjectByName("after");
                const main = messageBoard.getObjectByName("main");
                const warn = messageBoard.getObjectByName("warn");
                // console.log( content, link )
                messageBoard.remove(before, after, main, warn);
                if (!!link.length) {
                    this.init(content);
                    go.mesh.userData.active = true;
                    go.mesh.userData.link = link;
                } else {
                    const warnText = new Text("Sorry, there is nothing to go.", 10, 0xffca28, 94);
                    warnText.name = "warn";
                    messageBoard.add(warnText);
                    go.mesh.userData.active = false;
                }
            }
        }
    },
    createGo() {
        const Go = function () {
            this.mesh = new THREE.Object3D();

            // 盒子
            const boxGeo = new THREE.BoxGeometry(70, 30, 4);
            const boxMtl = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 1,
                shading: THREE.FlatShading,
            });
            const box = new THREE.Mesh(boxGeo, boxMtl);
            box.castShadow = true;
            box.receiveShadow = true;
            this.mesh.add(box);

            // 文字
            const textGeo = new THREE.TextGeometry("Goooo!!!", {
                font: fontGeo,
                size: 10,
                height: 4,
                curveSegments: 10
            });
            const textMtl = new THREE.MeshPhongMaterial({
                color: Colors.red,
                emissive: 0xff0000,
                shading: THREE.FlatShading
            });

            const text = new THREE.Mesh(textGeo, textMtl);
            text.position.x = -27;
            text.position.y = -4;

            this.mesh.name = "go";
            // this.mesh.userData.interactive = true;
            // this.mesh.userData.active = false;
            this.mesh.add(text);
        }

        go = new Go();
        go.mesh.scale.set( 0.03, 0.03, 0.03 );
        go.mesh.userData.active = false;
        go.mesh.userData.interactive = true;
        airplane.mesh.add( go.mesh );
    },
    createShape(x, y, width, height, radius, arrowLength) {
        const shape = new THREE.Shape();
        shape.moveTo(x, y + radius);
        shape.lineTo(x, y + height - radius);
        shape.quadraticCurveTo(x, y + height, x + radius, y + height);
        shape.lineTo(x + width - radius, y + height);
        shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
        shape.lineTo(x + width, y + radius);
        shape.quadraticCurveTo(x + width, y, x + width - radius, y);
        shape.lineTo(x+width/2+arrowLength/2, y);
        shape.lineTo(x+width/2, y-Math.sin(Math.PI/2)*arrowLength/2);
        shape.lineTo(x+width/2-arrowLength/2, y);
        shape.lineTo(x + radius, y);
        shape.quadraticCurveTo(x, y, x, y + radius);
        return shape;
    },
    loop() {
        model.updateAirplane();
        model.updateSea();
        model.updateSky();
        model.updateCamera();
        model.updateUrl();
        model.updateMessage();
        model.updataGo();
        renderer.render(scene, camera);
        requestAnimationFrame(model.loop);
    },
    updateSky() {
        if (airplane.propeller.userData.active) {
            skyFront.mesh.rotation.z += .02; //云旋转
            skyBack.mesh.rotation.z += .02; //云旋转
        } else {
            skyFront.mesh.rotation.z += .01; //云旋转
            skyBack.mesh.rotation.z += .01; //云旋转
        }
    },
    updateSea() {
        if (airplane.propeller.userData.active) {
            sea.mesh.rotation.z += .01; //大海旋转
        } else {
            sea.mesh.rotation.z += .005; //大海旋转
        }
        // sea.fishes.forEach( (fish) => {
        //     fish.finMove();
        // } );
        sea.moveWaves();
    },
    updateAirplane() {

        // 移动飞机移动范围: { x: 100~100, y: 50~150 }
        const targetX = this.normalize(mousePos.x, -1, 1, -100, 100);
        const targetY = this.normalize(mousePos.y, -1, 1, 50, 150);

        // 螺旋桨旋转
        if (airplane.propeller.userData.active) {
            airplane.propeller.rotation.x += 2;
        } else {
            airplane.propeller.rotation.x += 0.3;
        }

        // 更新飞机的位置
        airplane.mesh.position.y += (targetY - airplane.mesh.position.y) * 0.01;
        airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * 0.0128;
        airplane.mesh.rotation.x = (airplane.mesh.position.y - targetY) * 0.0064;

        // 头发起伏
        airplane.pilot.updateHairs();

        // 机翼变形
        airplane.sideWing.transform();

        // 盒子旋转
        airplane.boxContainer.rotation.z += 0.01;

        // 盒子收缩
        if (airplane.boxContainer.userData.active) {
            airplane.boxContainer.scale.x = airplane.boxContainer.scale.x < 1 ? airplane.boxContainer.scale.x + 0.03 : 1;
            airplane.boxContainer.scale.y = airplane.boxContainer.scale.y < 1 ? airplane.boxContainer.scale.y + 0.03 : 1;
            airplane.boxContainer.scale.z = airplane.boxContainer.scale.z < 1 ? airplane.boxContainer.scale.z + 0.03 : 1;
        } else {
            airplane.boxContainer.scale.x = airplane.boxContainer.scale.x > 0.03 ? airplane.boxContainer.scale.x - 0.03 : 0.03;
            airplane.boxContainer.scale.y = airplane.boxContainer.scale.y > 0.03 ? airplane.boxContainer.scale.y - 0.03 : 0.03;
            airplane.boxContainer.scale.z = airplane.boxContainer.scale.z > 0.03 ? airplane.boxContainer.scale.z - 0.03 : 0.03;
        }
    },
    updateCamera() {
        camera.fov += (this.normalize(mousePos.x, -1, 1, 40, 80) - camera.fov) * 0.1;
        camera.lookAt(new THREE.Vector3(0, 100, 0));
        camera.updateProjectionMatrix();
        if (camera.userData.active) {
            airplane.boxContainer.userData.active = false;
            camera.position.x += ( 200 - camera.position.x ) * 0.03;
            camera.position.z += ( 0 - camera.position.z ) * 0.03;
            // camera.userData.active = false;
        } else {
            airplane.boxContainer.userData.active = true;
            camera.position.x += ( 0 - camera.position.x ) * 0.03;
            camera.position.z += ( 200 - camera.position.z ) * 0.03;
        }
    },
    updateUrl() {
        urlBox.forEach(url => {
            url.rotate();
        });
    },
    updateMessage() {
        if (messageBoard.userData.active) {
            messageBoard.position.x += (-10 - messageBoard.position.x) * 0.1;
            messageBoard.position.y += (80 - messageBoard.position.y) * 0.1;
            messageBoard.scale.x = messageBoard.scale.x < 1 ? messageBoard.scale.x + 0.03 : 1;
            messageBoard.scale.y = messageBoard.scale.y < 1 ? messageBoard.scale.y + 0.03 : 1;
            messageBoard.scale.z = messageBoard.scale.z < 1 ? messageBoard.scale.z + 0.03 : 1;
        } else {
            messageBoard.position.x += (0 - messageBoard.position.x) * 0.02;
            messageBoard.position.y += (0 - messageBoard.position.y) * 0.02;
            messageBoard.scale.x = messageBoard.scale.x > 0.03 ? messageBoard.scale.x - 0.03 : 0.03;
            messageBoard.scale.y = messageBoard.scale.y > 0.03 ? messageBoard.scale.y - 0.03 : 0.03;
            messageBoard.scale.z = messageBoard.scale.z > 0.03 ? messageBoard.scale.z - 0.03 : 0.03;
        }
    },
    updataGo() {
        if (go.mesh.userData.active) {
            go.mesh.position.y += ( -100 - go.mesh.position.y ) * 0.03;
            go.mesh.rotation.y += ( Math.PI * 5 / 2 - go.mesh.rotation.y) * 0.05;
            go.mesh.scale.x = go.mesh.scale.x < 1 ? go.mesh.scale.x + 0.03 : 1;
            go.mesh.scale.y = go.mesh.scale.y < 1 ? go.mesh.scale.y + 0.03 : 1;
            go.mesh.scale.z = go.mesh.scale.z < 1 ? go.mesh.scale.z + 0.03 : 1;
        } else {
            go.mesh.position.y += ( 0 - go.mesh.position.y ) * 0.03;
            go.mesh.rotation.y += ( 0 - go.mesh.rotation.y) * 0.05;
            go.mesh.scale.x = go.mesh.scale.x > 0.03 ? go.mesh.scale.x - 0.03 : 0.03;
            go.mesh.scale.y = go.mesh.scale.y > 0.03 ? go.mesh.scale.y - 0.03 : 0.03;
            go.mesh.scale.z = go.mesh.scale.z > 0.03 ? go.mesh.scale.z - 0.03 : 0.03;
        }
    },
    handleMouseMove(event) {
        event.preventDefault();
        const center = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
        let x = event.clientX ? event.clientX : (event.changedTouches ? event.changedTouches[0].clientX : center.x);
        let y = event.clientX ? event.clientY : (event.changedTouches ? event.changedTouches[0].clientY : center.y);
        mousePos.x = -1 + (x / WIDTH) * 2;
        mousePos.y = 1 - (y / HEIGHT) * 2;
        raycaster.setFromCamera(mousePos, camera);
    },
    moveMotion() {
        const intersects = raycaster.intersectObjects(airplane.mesh.children, true);
        if (intersects.length > 0) {
            intersected = model.searchModelFromChild(intersects[0].object);
            if (intersected.name === "url") {
                intersected.userData.active = false;
            } else if (intersected.name === "go") {
                airplane.sideWing.mesh.userData.active = true;
                airplane.propeller.userData.active = true;
            }
        } else {
            airplane.sideWing.mesh.userData.active = false;
            airplane.propeller.userData.active = false;
            urlBox.forEach(url => {
                url.mesh.userData.active = true;
            });
        }
    },
    clickMotion() {
        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
            intersected = model.searchModelFromChild(intersects[0].object);
            if (!intersected) return;
            if (intersected.name === "url") {
                camera.userData.active = true;
                messageBoard.userData.active = true;
                this.createMessage().change(intersected);
            } else if (intersected.name === "go") {
                top.location = "http://" + intersected.userData.link;
            }
        } else {
            camera.userData.active = false;
            messageBoard.userData.active = false;
            go.mesh.userData.active = false;
        }
    },
    searchModelFromChild(child) {
        while (child) {
            if (child.userData.interactive) {
                return child;
            }
            child = child.parent;
        }
    },
    normalize(v, vmin, vmax, tmin, tmax) {
        const nv = Math.max(Math.min(v, vmax), vmin); //鼠标移出画布后坐标修正
        const dv = vmax - vmin; //坐标轴总长度
        const pc = (nv - vmin) / dv; //坐标百分化
        const dt = tmax - tmin; //取值范围
        const tv = tmin + (pc * dt); //范围内的实际坐标
        return tv;
    },
    computeBounding(object) {
        const box = new THREE.Box3().setFromObject(object); //包围盒
        const boundingSphere = box.getBoundingSphere(); //包围球
        const radius = boundingSphere.radius; //包围球半径
        const center = boundingSphere.center; //包围球球心
        const scale = 14 / radius; //缩放比例
        const maxLength = box.max.x - box.min.x; //包围盒最大长度
        const maxWidth = box.max.z - box.min.z; //包围盒最大宽度
        const maxHeight = box.max.y - box.min.y; //包围盒最大高度
        return { center, maxLength, maxWidth, maxHeight, radius, scale };
    },
    start() {
        window.addEventListener('load', model.init.call(model), false);
        renderer.domElement.addEventListener('mousemove', (ev) => {
            this.handleMouseMove(ev);
            this.moveMotion();
        }, false);
        renderer.domElement.addEventListener('touchmove', (ev) => {
            ev.preventDefault();
            this.handleMouseMove(ev);
            this.moveMotion();
        }, false);
        renderer.domElement.addEventListener('click', (ev) => {
            this.handleMouseMove(ev);
            this.clickMotion();
        }, false);
    }
}

model.start();
