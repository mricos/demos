dihedral-install(){
  sudo apt-get install mesa-utils
  sudo apt-get install freeglut3-dev
}

dihedral-build(){
  gcc dihedral.cpp -o dihedral -lglut -lGLU -lGL
}

build(){
  gcc $1.cpp -o $1 -lm -lglut -lGLU -lGL
}
