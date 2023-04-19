helix-help(){
cat <<EOF
  Helix explores the grammar of helixical structures
  over minimal error surfaces. Requires Node.JS env.

helix/
│
├── node_modules/
│
├── components/
│   ├── helix-pill.css
│   └──
│
├── public/
│   ├── index.html
│   └── styles.css (generated after running 'npm run build')
│
├── src/
│   └── styles.css
│
├── postcss.config.js
├── tailwind.config.js
└── package.json

Static: public/index.html
To build: npm run build
To serve: serve public
EOF
}

helix-install(){
  npm init -y
  npm install browser-sync --save-dev
  npm install postcss-import --save-dev
  [ -d ./package.json ] && npm init -y
  npm install tailwindcss postcss autoprefixer
  npm install --save-dev postcss-cli
}

helix-build(){
  npm run build
}

helix-serve(){
  npm start
}
helix-nuke(){
  read -p "Deleting src, public, <ret> to continue, ctrl-c to quit."
  rm -rf ./src
  rm -rf ./public
  rm -rf ./components
  rm ./build.sh
  rm ./tailwind.config.js
  rm ./postcss.config.js
}

helix-create(){
  [ -d ./src ] && echo "src exists, <ret> to continue, ctrl-c quits" && read
  mkdir ./src
  mkdir ./public
  mkdir ./src/components
  _helix-generate-tailwind.confg.js
  _helix-generate-postcss-config.js
  _helix-generate-styles.css
  _helix-generate-index.html
  _helix-generate-build.sh

  echo "Making default components" 
  _helix_generate_helix_pill_css2 > ./src/helix-pill.css

cat <<EOF

Add build cmd to  package.json:
  "scripts": {
    "build": "./build.sh"
   }

EOF
}

_helix-generate-build.sh(){
  cat <<EOF > ./build.sh
#!/bin/bash
cp src/index.html public/index.html  # This is where to add build time info
postcss src/styles.css -o public/styles.css
EOF
  chmod +x ./build.sh
}

_helix-generate-tailwind.confg.js(){
  cat <<EOF > ./tailwind.config.js
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        'body': ['Roboto', 'sans-serif']
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
EOF
}

_helix-generate-styles.css(){
  cat <<EOF > ./src/styles.css
@import './helix-pill.css';
@tailwind base;
@tailwind components;
@tailwind utilities;


@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

EOF
}


_helix-generate-postcss-config.js(){
  cat<<EOF > ./postcss.config.js
module.exports = {
  plugins: [
    require('postcss-import'),
    require('tailwindcss'),
    require('autoprefixer'),
  ]
}
EOF

}
_helix-generate-index.html(){

  cat <<'EOF' > ./src/index.html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HeLIx</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="./styles.css">
</head>
<body class="bg-gray-900 text-red-300 font-body min-h-screen flex flex-col">
    <header class="bg-gray-800 p-4">
        <!-- Header content -->
    </header>

    <main class="flex-1 flex items-center justify-center">
	<div
        data-border="0"
 		id="helixPill" class="helix-pill text-4xl py-2 px-4
        bg-gray-900 border-2 border-red-400
        rounded-full mt-1/3 cursor-pointer"
    >
      <div class="helix-pill" data-border="1">
        <div class="helix-pill" data-border="2">
          <div class="helix-pill" data-border="3">
            <div class="helix-pill" data-border="4">
              <div class="helix-pill" data-border="5">
                <div class="helix-pill" data-border="6">
                  <div id="helixPill" class="helix-pill" data-border="7">HeLiX</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </main>

    <footer class="bg-gray-800 p-4">
        <!-- Footer content -->
    </footer>

<script>
let spinning = false;
let animationFrameId;
const easingFactor = 0.95;
let rotation = 0;
let vibe=false;
function init() {
  const pill = document.getElementById('helixPill');
  let spinning = false;
  rotation = 0;

  const footer = document.querySelector('footer');
  footer.addEventListener('click', () => {
    vibe = !vibe;
  });


  let vibe = false;
  const helixPill = document.getElementById('helixPill');
  const innerPills = helixPill.querySelectorAll('.helix-pill[data-border]:not([data-border="0"])');

  // Initially, set display to none for all but the div with data-border="0"
  innerPills.forEach((pill) => {
    pill.style.display = 'none';
  });



  function spin() {

    if (vibe) {
      innerPills.forEach((pill) => {
        pill.style.display = 'block';
      });
    } else {
      innerPills.forEach((pill) => {
        pill.style.display = 'none';
      });
    }


    if (spinning) {
      rotation += 360 / (4 * 60); // Rotate at 1 revolution per 2 seconds
      pill.style.transform = `rotate(${rotation}deg)`;
      requestAnimationFrame(spin);
    }
  }

  pill.addEventListener('click', () => {
    spinning = !spinning;

    if (spinning) {
      spin();
    } else {
      const currentRotation = parseFloat(
                  pill.style.transform.match(
                        /rotate\((\d+(\.\d+)?)deg\)/)[1]
                  );
      const easedRotation = Math.ceil(currentRotation / 90) * 90;
      pill.style.transition = 'transform 1s ease-out';
      pill.style.transform = `rotate(${easedRotation}deg)`;
      setTimeout(() => {
        pill.style.transition = '';
      }, 1000);
      rotation = easedRotation;
    }
  });
}

document.addEventListener('DOMContentLoaded', init);


</script>
</body>
</html>
EOF

}

_helix_generate_helix_pill_css3() {
  cat <<EOF
.helix-pill {
  position: relative;
  display: inline-block;
  font-size: 2rem;
  padding: 8px 16px;
  cursor: pointer;
  background-color: #1F2937;
  border: 2px solid #F87171;
  border-radius: 9999px;
  transition: transform 1s ease-out;
}
EOF

  local border_widths=("8" "14" "20" "26" "32" "38" "44" "50")
  local hsl_hues=("0" "45" "90" "135" "180" "225" "270" "315")

  for i in {0..7}; do
    cat <<EOF
.helix-pill[data-border="${i}"]::before {
  content: "";
  position: absolute;
  top: -${border_widths[$i]}px;
  right: -${border_widths[$i]}px;
  bottom: -${border_widths[$i]}px;
  left: -${border_widths[$i]}px;
  border: ${border_widths[$i]}px solid hsla(${hsl_hues[$i]}, 100%, 50%, 0.3);
  border-radius: inherit;
  z-index: -1;
}
EOF
  done
}

_helix_generate_helix_pill_css2() {
  cat <<EOF
.helix-pill {
  position: relative;
  display: inline-block;
  font-size: 2rem;
  padding: 8px 16px;
  cursor: pointer;
  background-color: #1F2937;
  border: 2px solid #F87171;
  border-radius: 9999px;
  transition: transform 1s ease-out;
}
EOF

  local border_widths=("8" "14" "20" "26" "32" "38" "44" "50")
  local hsl_hues=("0" "45" "90" "135" "180" "225" "270" "315")

  for i in {0..7}; do
    cat <<EOF
.helix-pill[data-border="${i}"]::before {
  content: "";
  position: absolute;
  top: -${border_widths[$i]}px;
  right: -${border_widths[$i]}px;
  bottom: -${border_widths[$i]}px;
  left: -${border_widths[$i]}px;
  border: ${border_widths[$i]}px solid hsla(${hsl_hues[$i]}, 100%, 50%, 0.3);
  border-radius: inherit;
  z-index: -1;
}
.helix-pill[data-border="${i}"]::after {
  content: "";
  position: absolute;
  top: -${border_widths[$i]}px;
  right: -${border_widths[$i]}px;
  bottom: -${border_widths[$i]}px;
  left: -${border_widths[$i]}px;
  border: ${border_widths[$i]}px solid hsla(${hsl_hues[$i]}, 100%, 50%, 0.4);
  border-radius: inherit;
  z-index: -1;
}
EOF
  done
}

_helix_generate_helix_pill_css() {
  cat <<EOF
.helix-pill {
  position: relative;
  display: inline-block;
  font-size: 2rem;
  padding: 8px 16px;
  cursor: pointer;
  background-color: #1F2937;
  border: 2px solid #F87171;
  border-radius: 9999px;
  transition: transform 1s ease-out;
}
EOF

  local border_widths=("8" "14" "20" "26" "32" "38" "44" "50")
  local hsl_hues=("0" "45" "90" "135" "180" "225" "270" "315")

  for i in {0..7}; do
    cat <<EOF
.helix-pill[data-border="${i}"]::before {
  content: "";
  position: absolute;
  top: -${border_widths[$i]}px;
  right: -${border_widths[$i]}px;
  bottom: -${border_widths[$i]}px;
  left: -${border_widths[$i]}px;
  border: ${border_widths[$i]}px solid hsla(${hsl_hues[$i]}, 100%, 50%, 0.6);
  border-radius: inherit;
  z-index: -1;
}
.helix-pill[data-border="${i}"]::after {
  content: "";
  position: absolute;
  top: -${border_widths[$i]}px;
  right: -${border_widths[$i]}px;
  bottom: -${border_widths[$i]}px;
  left: -${border_widths[$i]}px;
  border: ${border_widths[$i]}px solid hsla(${hsl_hues[$i]}, 100%, 50%, 0.7);
  border-radius: inherit;
  z-index: -1;
}
EOF
  done
}

_helix_generate_helix_pill_css() {
  cat <<EOF
.helix-pill {
  position: relative;
  display: inline-block;
  font-size: 2rem;
  padding: 8px 16px;
  cursor: pointer;
  background-color: #1F2937;
  border: 2px solid #F87171;
  border-radius: 9999px;
  transition: transform 1s ease-out;
}
EOF

  local border_widths=("8" "14" "20" "26" "32" "38" "44" "50")
  local hsl_hues=("0" "45" "90" "135" "180" "225" "270" "315")
  local opacities=("0.6" "0.7" "0.8" "0.9" "1" "1" "1" "1")

  for i in {0..7}; do
    cat <<EOF
.helix-pill[data-border="${i}"]::before {
  content: "";
  position: absolute;
  top: -${border_widths[$i]}px;
  right: -${border_widths[$i]}px;
  bottom: -${border_widths[$i]}px;
  left: -${border_widths[$i]}px;
  border: ${border_widths[$i]}px solid hsla(${hsl_hues[$i]}, 100%, 50%, ${opacities[$i]});
  border-radius: inherit;
  z-index: -1;
}
.helix-pill[data-border="${i}"]::after {
  content: "";
  position: absolute;
  top: -${border_widths[$i]}px;
  right: -${border_widths[$i]}px;
  bottom: -${border_widths[$i]}px;
  left: -${border_widths[$i]}px;
  border: ${border_widths[$i]}px solid hsla(${hsl_hues[$i]}, 100%, 50%, ${opacities[$i]});
  border-radius: inherit;
  z-index: -1;
}
EOF
  done
}
