// ------------------------------------------------------------------
// loading proto file and creating the descriptor
const PROTO_PATH = __dirname + '/../proto/conversion.proto'
const REMOTE_URL = "localhost:50051"
const grpc = require('grpc')
const buffer = require('buffer')
const protoLoader = require('@grpc/proto-loader')
let packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
)
const protoD = grpc.loadPackageDefinition(packageDefinition) //proto file descriptor
const conversion = protoD.conversion // namespace containing stub constructors => you have defined it in the proto file under package

//server => nel nostro caso il server è in java ed è gia implementato, quindi mi interessa solo il client
//create a generic service instance
// add a service object objatined from stub constuctor and implementation mapping to server
// bind the server to an unused port and start it


//client
//instantiate stub by calling the stub constructor => it will also create an HTTP/2 channel to server
// call the methods on the stub

const client = new conversion.Converter(REMOTE_URL, grpc.credentials.createInsecure())
const splitInChunks = ( buffer , chunkSize)=>{
  let parts =[]
  for (let i = 0; chunkSize * i < buffer.length; i += 1) {
    parts.push(buffer.slice(chunkSize * i, (i + 1) * chunkSize))
  }
  return parts
}
exports.fileConvert = (request, res) => {
  console.log("inside fileconverty, request: ")
  console.log(request)
  let stream = [];
  let metadata
  const call = client.fileConvert();
  
  call.on('data', function (streamObject) {
    console.log('Just Got StreamObject : "', streamObject)
    if (streamObject.request_oneof === 'file') {
      console.log("file")
      stream.push(streamObject.file)
    }
    else if (streamObject.request_oneof === 'meta') {
      console.log("meta")
      metadata = streamObject
      console.log("meta2")
    }
  });
  call.on('end', function () {
    // The server has finished sending
    res.set('Content-Type', "image/" + request.meta.file_type_target)
    stream = Buffer.concat([...stream])
    return res.send(stream);
  });
  call.on('error', function (e) {
    // An error has occurred and the stream has been closed.
    console.log("onError: ", e)
    return
  });
  call.on('status', function (status) {
    // process status
    console.log("onStatus", status)
  });


  splitInChunks(request.file, 1024)
  .map(e => {
    return {
      file: e,
      request_oneof: 'file'
    }
  }).forEach(e => {
    //console.log("sending: ", e)
    call.write(e)
  })
  call.write({
    meta: request.meta,
    request_oneof: 'meta'
  })
  call.end()
}

//------------------------------------------------------------------