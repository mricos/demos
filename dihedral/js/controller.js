export function onStageMouseMove(event, object) {
  const cursor = document.getElementById('cursor');
  const stage = document.getElementById('stage');
  const stageRect = stage.getBoundingClientRect();
  let dispatchEvent=false;

  if (event.buttons === 1) {
    console.log("Button 1")
    cursor.style.left = `${event.clientX - stageRect.left}px`;
    cursor.style.top = `${event.clientY - stageRect.top}px`;
    dispatchEvent=true;
  }

  if (event.deltaY) { // Scroll is 150 or -150
    const scaleAmount = event.deltaY/148;
    const oldSize = parseFloat(cursor.style.width)
    //let newSize = Math.max(Math.pow(1.1,scaleAmount)*oldSize, 2);
    let newSize = Math.max(Math.pow(1.1,scaleAmount)*oldSize, 2);
    newSize = Math.min( parseFloat(stage.style.width), newSize);
    cursor.style.width = `${oldSize + scaleAmount}px`;
    cursor.style.height = `${oldSize + scaleAmount}px`;
    dispatchEvent=true;
  }


  if (dispatchEvent === false) return;

  let planeWidth = 4;
  const customEvent = new CustomEvent('3dControlChange', {
      detail: {
        x: (2 * planeWidth) * (event.clientX + stageRect.left) / stageRect.width - planeWidth,
        y: -(2 * planeWidth) * (event.clientY - stageRect.top) / stageRect.height + planeWidth,
        z: -4 + planeWidth * parseFloat(cursor.style.width) / 20,
        object: object,
      },
    });

  stage.dispatchEvent(customEvent);



};


export function on3dControlChange(mesh) {
  return function (event) {
    // Handle the x and y values from the custom event's detail
    const { x, y, z } = event.detail;
    // Perform any action based on the x and y values
    console.log("on3dControlChange", x,y,z);
    mesh.position.set(x,y,z );
  }
}
