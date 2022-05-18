export function enqueue<T>(arr: T[], obj: T, max: number, logMsg?: string){
    if (arr.length >= max)
        arr.shift();
    arr.push(obj);
    if(logMsg) console.log(logMsg + obj)
}
export function avg(arr: number[]){
    return arr.reduce((x, y) => x + y) / arr.length; // average
}
export function getMediaFromSrc(src: string): HTMLMediaElement | undefined {
    for (const video of document.getElementsByTagName("video")) {
        if (video.src === src)
            return video;
    }
}