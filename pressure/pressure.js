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

handlePointerMove = (e) => {
  console.log(e);
}

document.getElementById("blackboard").addEventListener(
		'pointermove',handlePointerMove);

