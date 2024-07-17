const preset = {
    k1: -0.4,
    k2: 0.2,
    k3: 0,
    k4: 0,
    focalLength: 1.0
}

// Function to load an external script
const loadScript = (url, callback) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

const handleImageUpload = (event, params) => {
    const file = event.target.files[0];
    if (file) {
        // Check if the file is an image
        if (file.type.startsWith('image/')) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.src = e.target.result;
                    img.onload = () => {
                        resolve(processImage(img, params))
                    };
                };
                reader.readAsDataURL(file);
            });
        } else {
            throw new Error("invalid file, must be an image.")
        }
    }
};

const processImage = (img, params) => {
    const src = window.cv.imread(img);
    const h = src.rows;
    const w = src.cols;

    const focalLength = w / 2 * params.focalLength;

    // Intrinsic camera matrix (K)
    const K = window.cv.matFromArray(3, 3, window.cv.CV_32F, [
        focalLength, 0, w / 2,
        0, focalLength, h / 2,
        0, 0, 1
    ]);

    // Distortion coefficients (D)
    const D = window.cv.matFromArray(1, 4, window.cv.CV_32F, [params.k1, params.k2, params.k3, params.k4]);

    // Undistortion map
    const map1 = new window.cv.Mat();
    const map2 = new window.cv.Mat();
    window.cv.fisheye_initUndistortRectifyMap(K, D, window.cv.Mat.eye(3, 3, window.cv.CV_32F), K, new window.cv.Size(w, h), window.cv.CV_32FC1, map1, map2);

    // Apply the transformation
    const dst = new window.cv.Mat();
    window.cv.remap(src, dst, map1, map2, window.cv.INTER_LINEAR, window.cv.BORDER_CONSTANT, new window.cv.Scalar());

    return dst;
};

module.exports = (() => {
    loadScript('https://docs.opencv.org/4.x/opencv.js',
        () => {
            // Set an interval to check if OpenCV is ready
            const checkInterval = setInterval(function () {
                if (typeof window.cv !== 'undefined') {
                    clearInterval(checkInterval);
                    return true;
                }
            }, 100); // Check every 100ms
        }
    )

    return {
        newImage: '',
        convert(image, params = preset) {
            this.newImage = handleImageUpload(image, params)
            return this;
        },
        show(output = 'outputCanvas') {
            this.newImage.then(image => {
                window.cv.imshow(output, image);
            })
            return this.newImage;
        }
    }
})()