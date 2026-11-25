// WYDOT road cameras near the Miracle Mile, served to the iOS app at /api/cams.
//
// Image links come from the WYDOT 511 map (map.wyoroad.info/511-map, Web
// Cameras layer): click a camera, then copy each photo's image address.
// WYDOT posts a new photo about every 5 minutes at the same link. If a camera
// goes blank in the app, re-copy its links from the map and update them here.
// Locations are approximate (read off the map), good enough for map pins.

export type CamShot = { label: string; url: string; takenAt?: number };
export type RoadCam = {
  id: string;
  name: string;
  road: string;
  lat: number;
  lon: number;
  shots: CamShot[];
};

const wydot = (ref: string) => `https://www.wyoroad.info/web-cam/cache?ref=${ref}`;

export const CAMS: RoadCam[] = [
  {
    id: "pathfinder",
    name: "Pathfinder",
    road: "WY 220",
    lat: 42.6382,
    lon: -106.8513,
    shots: [
      { label: "Facing west", url: wydot("VTJGc2RHVmtYMTlWeksxUEFRVkFZM1JUd0EwQmV6Rlo1WW9ZR2N3cE5ISTloaTlKVFEyYTVtc09ydkozYmc4UWlPTE1raVFYVWpHZWw5ejZDV3c2UWxrckRUay9JWUJPSy9EbStZTnlCNVE9") },
      { label: "Facing east", url: wydot("VTJGc2RHVmtYMTlINWdLVWRYWFMxK2xyNlAzR1Y1Y3FRR3dVRWdUZCs1bDdERDg5ZW9HSHduQzlxNTFkbWlvWCthYVdWU1VzNlpUd1BxWE9BeGZ3dlpFTEhiQ2NmOGkreHYxNHM5clIzQTg9") },
      { label: "Road surface", url: wydot("VTJGc2RHVmtYMTg2OUVoMVhwNVRONE1DOTNYMDF5Nmw2Nk5Jd2hsZXBNWE14Z044dkx0QUVCQ3RPK3VtanV6TElwNk5XOXY5L1R6VngxTEoyTDBjV3c9PQ==") },
    ],
  },
  {
    id: "sinclair",
    name: "Sinclair",
    road: "I-80",
    lat: 41.8412,
    lon: -107.093,
    shots: [
      { label: "Facing west", url: wydot("VTJGc2RHVmtYMThiVlAzbmFRZmozYlFIem5WTENXRlk5RDR5M1BycHRvMk1vYlNIUnhydXZlWDdHcm5HdHBLYzV3R3BlcExQeDFtQlFqeE80WHA1RkE9PQ==") },
      { label: "Facing east", url: wydot("VTJGc2RHVmtYMStMK2tLR1ZjS3lWNEs2SC9vZWhVN1YwNFVZUzVLcGllUnNyS2tYSlB6S29xdEcwSFRpcTJMTzl4VTkvRXRtcy93VWpYYkkrU2g0QUE9PQ==") },
      { label: "Gate", url: wydot("VTJGc2RHVmtYMS9sbE9Sd0MvVWU1dkNZZHR3M3RkTFFYY1c4NFZrT2diaDBnVVdVS2ovN1RCSWJWOFNFSUdBaEczNkV6aGJOWjlvbDRvRXpjYi82OFE9PQ==") },
      { label: "Road surface", url: wydot("VTJGc2RHVmtYMS9UOXJ6eEdlSndkZ1JEWWN3UFBsN2ZOakdheGlMWGtKZ3JWWHJSdGFxa1pMZVJDTUtlYTgyajgyandqeU9xazA1NFdjSk94RHJGZ1E9PQ==") },
    ],
  },
  {
    id: "wy220-mm97",
    name: "WY 220 Mile 97",
    road: "WY 220",
    lat: 42.7674,
    lon: -106.5877,
    shots: [
      { label: "Facing south", url: wydot("VTJGc2RHVmtYMS90SFptWWQ0TU53TURlRkxwUmZpMTVleURtZHdZZEE0emVlQXROUzJXaVExNlBtc3I4YzhIcllQZWt5MnFpVFpSNmZVMjlyL25MUEE9PQ==") },
      { label: "Facing north", url: wydot("VTJGc2RHVmtYMS8zanpDVzkwenhTdmlFRGREYzBkWE5CRjdlLzZ5MkZhc2xKSHdxcXgrTUdNZ2cvdFBuaWplaFZYQVUvL2kzZ1J0MDFTcU44SnlrNGc9PQ==") },
      { label: "Road surface", url: wydot("VTJGc2RHVmtYMTh3U1g2S0dCbXZNa1lRZzZrNmw2b2M3ZDYwYzJZejhpa3Q0d1Y1Uzdnemo1Vkp6eWZmRnJGdTFCYlM5VktmeWNrNjY1UDMxL3N5a3dQTkxJR1JEaHB6RVZxWjVjb0R3UEU9") },
    ],
  },
  {
    id: "muddy-gap",
    name: "Muddy Gap",
    road: "WY 220",
    lat: 42.4521,
    lon: -107.4446,
    shots: [
      { label: "Facing west", url: wydot("VTJGc2RHVmtYMTkzMlloUVVaeE91dEEwTThuUDFYQi9VL1ZlS2RNMHZ5LzlqMFlBdUltb3h6VnNCQ1hDdyt6RkNvbDFCdUFsclZPZllBRU9VUlYxSHVRZ0dGSURxR2hGbC9SZHdhbHhDREE9") },
      { label: "Facing east", url: wydot("VTJGc2RHVmtYMSs4dUpyUFdlVWxrWG9zS1lzTVdRa0tEY1oxSk10RmJvVlEvZ3JtbGxuTk5BZGV1bS9NWU11cFVKS2JZd21KQTIzNmt0Q294OWNMOFdXVEJsbkhNenhPa08zdE9BNlJneHc9") },
      { label: "Road surface", url: wydot("VTJGc2RHVmtYMS9hNmFyd1lzU1ZGRW5sU2ovS0FQS3JROFMwcndUcmZaenQ3bGFBcVFlSWl2MDFGRSt5QVZpaG5ZczlaMzk0NVdzaTA0YUh2bjh2bUR3MmVNYnVjalY4bzVIUHpwb0ZoazA9") },
    ],
  },
];
