const { 
    HLS_URL,
    PLAYLIST_GET_TIMEOUT=1000,
    TS_COUNT_TO_KEEP=10
 } = require('./config.json')

const path = require('path');
const { EventEmitter } = require('events');
const debug = require('debug');
const axios = require('axios').default;
const m3u8Parser = require('m3u8-parser');

const logger = {
    'debug': debug('debug'),
    'info': debug('info'),
    'warn': debug('warn'),
    'error': debug('error'),
}

const getMonitorUrl = () => HLS_URL;
const splitLastString = (string, sep='/') => {
    const array = string.split(sep);
    const lastElement = array.pop();
    return [array.join(sep), lastElement];
}
const splitFirtString = (string, sep='/') => {
    const array = string.split(sep);
    const [firstElement, ...rest] = array;
    return [firstElement, ...rest];
}

const getPlaylist = async (url, timeout=PLAYLIST_GET_TIMEOUT,) => {
    logger.debug(`get playlist: ${url}`);
    try {
        const response = await axios.get(url);
        return response.data
    } catch (err) {
        // throw error if status code is under 300.
        throw {
            code:1000, 
            message:'error in axios.get '+url,
            orignalErr: err.message
        }
    }
}


// m3u8 util
const parseM3U8 = manifest => {
    try {
        const parser = new m3u8Parser.Parser();
        parser.push(manifest);
        parser.end();
        return parser.manifest;
    } catch (err) {
        throw {code:2000, message:'error in parse m3u8  '+manifest};
    }
}

const getChunkManifest = async (base, lastPart) => {
    try {
        const fullUrl = lastPart.startsWith('http') ? lastPart : `${base}/${lastPart}`;
        const m3u8 = await getPlaylist(fullUrl);
        const manifest = parseM3U8(m3u8);
        if(manifest.segments.length === 0){
            return getChunkManifest(base, manifest.playlists[0].uri);
        } else {
            return manifest;
        }
    } catch (err) {
        console.error(err)
    }
}

const m3u8Check = new EventEmitter();
const hlsLiveCheck = new EventEmitter();
const downloadCheck = new EventEmitter();
const tsFileCheck = new EventEmitter();

m3u8Check.on('start', async (url, liveCheck=true) => {
    const [urlBase, urlLastPart] = splitLastString(url, '/');
    logger.debug(urlBase, urlLastPart)
    try {
        const manifest = await getChunkManifest(urlBase, urlLastPart);
        const recentTSFiles = manifest.segments.map(segment => {
            const [, filePart] = splitLastString(segment.uri, '/');
            const [tsFileName,] = splitFirtString(filePart, '?')
            return tsFileName;
        })
    console.log(recentTSFiles)
    } catch (err){
        console.error(err)
    }

})

const main = async () => {
    const url = getMonitorUrl();
    m3u8Check.emit('start', {url, liveCheck:true});
    m3u8Check.emit('success', (segments) => {
        const {first, second} = segments;
        hlsLiveCheck.emit('start', )
    })
    // const [urlBase, urlLastPart] = splitLastString(url, '/');
    // logger.debug(urlBase, urlLastPart)
    // try {
    //     const manifest = await getChunkManifest(urlBase, urlLastPart);
    //     const recentTSFiles = manifest.segments.map(segment => {
    //         const [, filePart] = splitLastString(segment.uri, '/');
    //         const tsFileName = splitFirtString(filePart, '?')
    //         return tsFileName;
    //     })
    //     const getManifestInterval = (manifest.targetDuration / 2) * 1000;
    //     let mergedTsFiles = [...recentTSFiles];
    //     setInterval( async () => {
    //         const manifest = await getChunkManifest(urlBase, urlLastPart);
    //         const newTSFiles = manifest.segments.map(segment => {
    //             const [, filePart] = splitLastString(segment.uri, '/');
    //             const tsFileName = splitFirtString(filePart, '?')
    //             return tsFileName;
    //         })
    //         mergedTsFiles = merge(mergedTsFiles, newTSFiles).splice(TS_COUNT_TO_KEEP * -1);
    //     }, getManifestInterval);

        // const firstSegment = manifest.segments[0];
        // let lastTsFile = firstSegment.uri.split('?').shift();
        // console.log(Date.now(), firstSegment.duration, lastTsFile, manifest.targetDuration);
        // setInterval(async () => {
        //     const nextManifest = await getChunkManifest(urlBase, urlLastPart);
        //     const segment = nextManifest.segments[0];
        //     const nextTsFile = segment.uri.split('?').shift();
        //     if(lastTsFile === nextTsFile){
        //         count++;
        //         console.log(count);
        //     } else {
        //         console.log(Date.now(),'changed:',count, segment.duration, lastTsFile, nextManifest.targetDuration);
        //         count=0;
        //         lastTsFile = nextTsFile;
        //     }
        // },1000)
    // } catch (err){
        // console.error(err)
    // }
}

main()
