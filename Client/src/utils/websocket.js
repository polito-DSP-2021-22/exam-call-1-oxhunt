const url = 'ws://localhost:5000'
let ws = new WebSocket(url)


function webSocketObject(setOnlineList, handleErrors) {
  const queueWaitTime = 500
  const reloadPageDelay = 90000
  var newList = []
  const wsMessageQueue = [];

  //WebSocket Methods
  const reloadPage = function () {
    window.location.reload()
  }
  ws.onopen = () => {
    console.log("ws: Connected, Sending message from client to server")
    ws.send('Message From Client');
  }
  ws.onclose = () => {
    handleErrors({ error: "Lost connection with Websocket Server reloading in "+ reloadPageDelay/1000 +" seconds" })
    setTimeout(reloadPage, reloadPageDelay)//reload the page after 10 seconds
  }

  ws.onerror = (error) => {
    console.log("WebSocket error:", error);
  }

  ws.onmessage = (e) => {
    wsMessageQueue.push(e.data.toString())
    setTimeout(emptyWsQueue, queueWaitTime)
  }


  const emptyWsQueue = () => {
    if (wsMessageQueue === 0) return;
    while (wsMessageQueue.length > 0) {
      let datas = wsMessageQueue.shift()
      datas = JSON.parse(datas.toString());
      //console.log(datas)
      if (datas.typeMessage === "logout") {
        //console.log("newlist: ", newList,"   datas: ", datas)
        newList = newList.filter((x) => x.userId !== datas.userId);
        //console.log("logout, onlinelistAfter: ", newList)
      }
      if (datas.typeMessage === "update" || datas.typeMessage === "login") {
        //console.log("newlist: ", newList,"   datas: ", datas)
        newList = newList.filter((x) => x.userId !== datas.userId);
        newList.push(datas);
        //console.log("login, onlinelistAfter: ", newList)
      }
    }
    setOnlineList(newList.map(e => e));
  }
}

export default webSocketObject