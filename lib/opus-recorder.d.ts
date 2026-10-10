declare module "opus-recorder" {
  type RecorderConfig = {
    encoderPath?: string;
    encoderSampleRate?: number;
    streamPages?: boolean;
    numberOfChannels?: number;
    encoderApplication?: number;
    encoderFrameSize?: number;
    maxFramesPerPage?: number;
    resampleQuality?: number;
    wavBitDepth?: number;
    sourceNode?: AudioNode;
  };

  export default class Recorder {
    constructor(config?: RecorderConfig);
    ondataavailable: (typedArray: Uint8Array) => void;
    onstart: () => void;
    onstop: () => void;
    onpause: () => void;
    onresume: () => void;
    onerror: (error: unknown) => void;
    start(): Promise<void>;
    stop(): void;
    pause(flush?: boolean): void;
    resume(): void;
    close(): void;
  }
}
