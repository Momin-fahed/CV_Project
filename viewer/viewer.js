import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

class PointCloudViewer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 100);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.cameras = [];
        this.cameraSpheres = [];
        this.currentCameraIndex = 0;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isTransitioning = false;
        this.loadingEl = document.getElementById('loading');
        this.loadingTextEl = document.querySelector('#loading .loading-text');
        this.pointCloudCenter = new THREE.Vector3();
        this.pointCloudRadius = 1;
        this.gridHelper = null;
        this.axesHelper = null;
        
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(2, 2, 2);
        this.camera.lookAt(0, 0, 0);

        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Setup scene
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Add grid helper
        this.gridHelper = new THREE.GridHelper(2, 20, 0x444444, 0x222222);
        this.scene.add(this.gridHelper);

        // Add axes helper
        this.axesHelper = new THREE.AxesHelper(1);
        this.scene.add(this.axesHelper);

        // Event listeners
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        document.getElementById('next-view').addEventListener('click', () => this.nextCamera());
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());

        // Load data
        this.loadCameras();
        this.loadPointCloud();

        // Start animation loop
        this.animate();
    }

    async loadCameras() {
        try {
            const response = await fetch('cameras.json');
            const data = await response.json();
            this.cameras = data.cameras;

            // Create camera spheres
            const sphereGeometry = new THREE.SphereGeometry(0.02, 16, 16);
            const sphereMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                emissive: 0x00ff00,
                emissiveIntensity: 0.5,
                metalness: 0.5,
                roughness: 0.5
            });

            this.cameras.forEach((cam, index) => {
                const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
                sphere.position.set(cam.position[0], cam.position[1], cam.position[2]);
                sphere.userData = { cameraIndex: index, type: 'cameraSphere' };
                this.scene.add(sphere);
                this.cameraSpheres.push(sphere);

                // Add a small cone to show camera direction
                const coneGeometry = new THREE.ConeGeometry(0.01, 0.03, 8);
                const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const cone = new THREE.Mesh(coneGeometry, coneMaterial);
                cone.rotation.x = Math.PI / 2;
                cone.position.z = 0.025;
                sphere.add(cone);
            });

            console.log(`Loaded ${this.cameras.length} cameras`);
        } catch (error) {
            console.error('Error loading cameras:', error);
        }
    }

    async loadPointCloud() {
        const loader = new PLYLoader();
        
        try {
            this.updateLoadingText('Loading point cloud...');
            let geometry;

            try {
                const response = await fetch('final_point_cloud.ply');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} while fetching point cloud`);
                }

                const buffer = await response.arrayBuffer();
                this.updateLoadingText('Parsing point cloud...');
                geometry = loader.parse(buffer);
            } catch (networkError) {
                console.warn('Falling back to loader.load after fetch failure', networkError);
                this.updateLoadingText('Fallback loader starting...');
                geometry = await new Promise((resolve, reject) => {
                    loader.load('final_point_cloud.ply', resolve, undefined, reject);
                });
            }

            geometry.computeVertexNormals();
            geometry.computeBoundingSphere();

            const radius = geometry.boundingSphere ? geometry.boundingSphere.radius : 1;
            const pointSize = Math.max(0.002, Math.min(0.02, radius * 0.0025));

            // Create point cloud material sized to the scene
            const material = new THREE.PointsMaterial({
                size: pointSize,
                vertexColors: true,
                sizeAttenuation: true
            });

            // If no colors in PLY, add default color
            if (!geometry.attributes.color) {
                const colors = new Float32Array(geometry.attributes.position.count * 3);
                for (let i = 0; i < colors.length; i += 3) {
                    colors[i] = 0.8;
                    colors[i + 1] = 0.8;
                    colors[i + 2] = 0.8;
                }
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }

            const points = new THREE.Points(geometry, material);
            this.scene.add(points);

            this.pointCloudCenter.copy(geometry.boundingSphere.center);
            this.pointCloudRadius = radius || this.pointCloudRadius;

            this.positionSceneHelpers();
            this.frameCameraToScene();

            if (this.loadingEl) {
                this.loadingEl.style.display = 'none';
            }
            console.log('Point cloud loaded successfully');
        } catch (error) {
            console.error('Error loading point cloud:', error);
            this.updateLoadingText('Error loading point cloud. Please check console.');
        }
    }

    updateLoadingText(message) {
        if (this.loadingTextEl) {
            this.loadingTextEl.textContent = message;
        }
    }

    positionSceneHelpers() {
        if (this.gridHelper) {
            const scale = Math.max(1, this.pointCloudRadius * 0.6);
            this.gridHelper.position.set(
                this.pointCloudCenter.x,
                this.pointCloudCenter.y - this.pointCloudRadius * 0.5,
                this.pointCloudCenter.z
            );
            this.gridHelper.scale.setScalar(scale);
        }

        if (this.axesHelper) {
            const axisScale = Math.max(1, this.pointCloudRadius * 0.25);
            this.axesHelper.position.copy(this.pointCloudCenter);
            this.axesHelper.scale.setScalar(axisScale);
        }
    }

    frameCameraToScene() {
        const radius = Math.max(this.pointCloudRadius, 0.5);
        const fitOffset = 2.2;
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const distance = (radius * fitOffset) / Math.sin(fov / 2);
        const direction = new THREE.Vector3(1, 1, 1).normalize();

        this.camera.position.copy(this.pointCloudCenter).add(direction.multiplyScalar(distance));
        this.controls.target.copy(this.pointCloudCenter);
        this.camera.near = Math.max(0.01, radius / 100);
        this.camera.far = Math.max(distance * 4, radius * 10);
        this.camera.updateProjectionMatrix();
        this.controls.update();
    }

    onMouseClick(event) {
        if (this.isTransitioning) return;

        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast to find intersections
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cameraSpheres);

        if (intersects.length > 0) {
            const sphere = intersects[0].object;
            const cameraIndex = sphere.userData.cameraIndex;
            this.moveToCameraView(cameraIndex);
        }
    }

    moveToCameraView(index) {
        if (index < 0 || index >= this.cameras.length || this.isTransitioning) return;

        this.isTransitioning = true;
        this.currentCameraIndex = index;
        const cam = this.cameras[index];

        // Highlight selected sphere
        this.cameraSpheres.forEach((sphere, i) => {
            sphere.material.emissiveIntensity = i === index ? 1.0 : 0.5;
        });

        // Convert quaternion to Euler angles for camera orientation
        const quaternion = new THREE.Quaternion(
            cam.quaternion[0],
            cam.quaternion[1],
            cam.quaternion[2],
            cam.quaternion[3]
        );

        const targetPosition = new THREE.Vector3(
            cam.position[0],
            cam.position[1],
            cam.position[2]
        );

        // Calculate look-at point (camera is looking in -Z direction)
        const lookDirection = new THREE.Vector3(0, 0, -1);
        lookDirection.applyQuaternion(quaternion);
        const targetLookAt = targetPosition.clone().add(lookDirection);

        // Animate camera transition
        this.animateCameraTransition(targetPosition, targetLookAt, () => {
            this.showImage(cam.image);
            this.isTransitioning = false;
        });
    }

    animateCameraTransition(targetPosition, targetLookAt, callback) {
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 1500;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out)
            const ease = t < 0.5 
                ? 4 * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            // Interpolate position
            this.camera.position.lerpVectors(startPosition, targetPosition, ease);
            
            // Interpolate look-at target
            this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
            this.controls.update();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                callback();
            }
        };

        animate();
    }

    showImage(imageName) {
        const overlay = document.getElementById('image-overlay');
        const image = document.getElementById('overlay-image');
        
        image.src = imageName;
        overlay.classList.add('visible');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            overlay.classList.remove('visible');
        }, 3000);
    }

    nextCamera() {
        if (this.cameras.length === 0) return;
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
        this.moveToCameraView(this.currentCameraIndex);
    }

    resetView() {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        const radius = Math.max(this.pointCloudRadius, 0.5);
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const distance = (radius * 2.2) / Math.sin(fov / 2);
        const direction = new THREE.Vector3(1, 1, 1).normalize();

        const targetPosition = this.pointCloudCenter.clone().add(direction.multiplyScalar(distance));
        const targetLookAt = this.pointCloudCenter.clone();

        // Reset sphere highlights
        this.cameraSpheres.forEach(sphere => {
            sphere.material.emissiveIntensity = 0.5;
        });

        this.animateCameraTransition(targetPosition, targetLookAt, () => {
            this.isTransitioning = false;
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize viewer when DOM is loaded
new PointCloudViewer();
