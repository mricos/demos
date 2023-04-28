document.addEventListener('DOMContentLoaded', event => {
  let button = document.getElementById('connect')

  button.addEventListener('click', async() => {
    let device
    const VENDOR_ID = 0x056a
    try {
      device = await navigator.usb.requestDevice({
        filters: [{
          vendorId: VENDOR_ID
        }]
      })

      console.log('open')
      await device.open()
      console.log('opened:', device)
    } catch (error) {
      console.log(error)
    }
	  await device.close()
  })
})


mapper=document.getElementById("mapper");
function eventToHtml(e){
  return `{
  offsetX: ${e.offsetX.toFixed(2)},
  offsetY: ${e.offsetY.toFixed(2)}
}`;
    
}
handlePointerMove = (e) => {
  console.log(e);
  mapper.innerHTML=eventToHtml(e);
}

document.getElementById("input").addEventListener(
		'pointermove',handlePointerMove);

