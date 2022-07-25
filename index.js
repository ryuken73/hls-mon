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
        console.log('#fullUrl = ', fullUrl);
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

    } catch (err){
        console.error(err)
    }

}

main()
