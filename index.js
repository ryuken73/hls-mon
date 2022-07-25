const { 
    HLS_URL,
    PLAYLIST_GET_TIMEOUT=1000,
 } = require('./config.json')

const path = require('path')
const axios = require('axios').default;
const m3u8Parser = require('m3u8-parser');

const getMonitorUrl = () => HLS_URL;

const splitLastString = (string, sep='/') => {
    const array = string.split(sep);
    const lastElement = array.pop();
    return [array.join(sep), lastElement];
}

const getPlaylist = async (url, timeout=PLAYLIST_GET_TIMEOUT,) => {
    console.log(`get playlist:`, url)
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

const main = async () => {
    const url = getMonitorUrl();
    const [base, lastPart] = splitLastString(url, '/');
    console.log(base, lastPart)
    try {
        const manifest = await getChunkManifest(base, lastPart);
        console.log(manifest)
        const firstSegment = manifest.segments[0];
        let lastTsFile = firstSegment.uri.split('?').shift();
        let count = 0;
        console.log(Date.now(), firstSegment.duration, lastTsFile, manifest.targetDuration);
        setInterval(async () => {
            const nextManifest = await getChunkManifest(base, lastPart);
            const segment = nextManifest.segments[0];
            const nextTsFile = segment.uri.split('?').shift();
            if(lastTsFile === nextTsFile){
                count++;
                console.log(count);
            } else {
                console.log(Date.now(),'changed:',count, segment.duration, lastTsFile, nextManifest.targetDuration);
                count=0;
                lastTsFile = nextTsFile;
            }
        },1000)
    } catch (err){
        console.error(err)
    }

}

main()
