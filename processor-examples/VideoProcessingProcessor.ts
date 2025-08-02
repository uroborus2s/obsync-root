// 视频处理器示例 - 展示如何处理大文件、长时间运行的任务
// 支持视频转码、截图、水印添加等复杂操作

import { ChildProcess, spawn } from 'child_process';
import { promises as fs } from 'fs';
import { BaseTaskProcessor } from '../base/BaseTaskProcessor.js';
import { ExecutionContext, ProcessorResult } from '../interfaces/ITaskProcessor.js';

interface VideoProcessingParams {
  input: {
    source: string; // 输入视频路径或URL
    format?: string; // 输入格式（自动检测）
  };
  operations: Array<{
    type: 'transcode' | 'extract_frames' | 'add_watermark' | 'trim' | 'merge' | 'compress';
    config: Record<string, any>;
  }>;
  output: {
    path: string;
    format: string; // mp4, avi, mov, webm等
    quality?: 'low' | 'medium' | 'high' | 'ultra';
    resolution?: string; // 1920x1080, 1280x720等
  };
  options: {
    ffmpegPath?: string;
    tempDir?: string;
    maxFileSize?: number; // MB
    timeout?: number; // 秒
    preserveMetadata?: boolean;
  };
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  fileSize: number;
}

export class VideoProcessingProcessor extends BaseTaskProcessor {
  readonly name = 'videoProcessing';
  readonly version = '1.0.0';
  
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private tempFiles: Set<string> = new Set();
  
  async validateParameters(params: VideoProcessingParams): Promise<boolean> {
    if (!params.input?.source || !params.output?.path) {
      return false;
    }
    
    if (!params.operations || !Array.isArray(params.operations) || params.operations.length === 0) {
      return false;
    }
    
    // 验证操作类型
    const validOperations = ['transcode', 'extract_frames', 'add_watermark', 'trim', 'merge', 'compress'];
    for (const operation of params.operations) {
      if (!validOperations.includes(operation.type)) {
        return false;
      }
    }
    
    return true;
  }
  
  protected async beforeExecute(params: VideoProcessingParams, context: ExecutionContext): Promise<void> {
    await super.beforeExecute(params, context);
    
    // 检查FFmpeg是否可用
    const ffmpegPath = params.options.ffmpegPath || 'ffmpeg';
    try {
      await this.runCommand(ffmpegPath, ['-version'], context);
      context.logger.info(`FFmpeg found at: ${ffmpegPath}`);
    } catch (error) {
      throw new Error(`FFmpeg not found. Please install FFmpeg or specify correct path.`);
    }
    
    // 创建临时目录
    const tempDir = params.options.tempDir || '/tmp/video-processing';
    await fs.mkdir(tempDir, { recursive: true });
    context.metadata.tempDir = tempDir;
  }
  
  protected async doExecute(params: VideoProcessingParams, context: ExecutionContext): Promise<ProcessorResult> {
    const { input, operations, output, options } = params;
    const processId = `video_${Date.now()}`;
    
    try {
      // 1. 获取输入视频信息
      await context.progress(5, 'Analyzing input video...');
      const inputMetadata = await this.getVideoMetadata(input.source, options, context);
      
      context.logger.info('Input video metadata', inputMetadata);
      
      // 检查文件大小限制
      if (options.maxFileSize && inputMetadata.fileSize > options.maxFileSize * 1024 * 1024) {
        throw new Error(`Input file size (${Math.round(inputMetadata.fileSize / 1024 / 1024)}MB) exceeds limit (${options.maxFileSize}MB)`);
      }
      
      // 2. 执行操作链
      let currentInput = input.source;
      const operationResults: any[] = [];
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const progress = 10 + (i / operations.length) * 80;
        
        await context.progress(progress, `Executing ${operation.type}...`);
        
        const operationResult = await this.executeOperation(
          operation,
          currentInput,
          inputMetadata,
          options,
          context,
          processId,
          i === operations.length - 1 ? output.path : undefined
        );
        
        operationResults.push(operationResult);
        currentInput = operationResult.outputPath;
        
        context.logger.info(`Completed operation ${operation.type}`, {
          inputPath: operationResult.inputPath,
          outputPath: operationResult.outputPath,
          duration: operationResult.duration
        });
      }
      
      // 3. 获取最终输出信息
      await context.progress(95, 'Analyzing output video...');
      const outputMetadata = await this.getVideoMetadata(output.path, options, context);
      
      await context.progress(100, 'Video processing completed');
      
      return {
        success: true,
        data: {
          input: {
            path: input.source,
            metadata: inputMetadata
          },
          output: {
            path: output.path,
            metadata: outputMetadata
          },
          operations: operationResults,
          performance: {
            totalDuration: Date.now() - context.metadata.startTime,
            compressionRatio: inputMetadata.fileSize / outputMetadata.fileSize,
            qualityChange: this.calculateQualityChange(inputMetadata, outputMetadata)
          }
        },
        metadata: {
          ffmpegVersion: await this.getFFmpegVersion(options),
          tempFilesCreated: this.tempFiles.size,
          processId
        }
      };
      
    } catch (error) {
      throw new Error(`Video processing failed: ${(error as Error).message}`);
    } finally {
      // 清理进程
      this.activeProcesses.delete(processId);
    }
  }
  
  private async executeOperation(
    operation: VideoProcessingParams['operations'][0],
    inputPath: string,
    inputMetadata: VideoMetadata,
    options: VideoProcessingParams['options'],
    context: ExecutionContext,
    processId: string,
    finalOutputPath?: string
  ): Promise<any> {
    const startTime = Date.now();
    const tempDir = context.metadata.tempDir;
    const outputPath = finalOutputPath || `${tempDir}/temp_${Date.now()}_${operation.type}.mp4`;
    
    if (!finalOutputPath) {
      this.tempFiles.add(outputPath);
    }
    
    let ffmpegArgs: string[] = [];
    
    switch (operation.type) {
      case 'transcode':
        ffmpegArgs = this.buildTranscodeArgs(inputPath, outputPath, operation.config, inputMetadata);
        break;
      case 'extract_frames':
        return await this.extractFrames(inputPath, operation.config, tempDir, context);
      case 'add_watermark':
        ffmpegArgs = this.buildWatermarkArgs(inputPath, outputPath, operation.config);
        break;
      case 'trim':
        ffmpegArgs = this.buildTrimArgs(inputPath, outputPath, operation.config);
        break;
      case 'compress':
        ffmpegArgs = this.buildCompressArgs(inputPath, outputPath, operation.config, inputMetadata);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation.type}`);
    }
    
    // 执行FFmpeg命令
    const ffmpegPath = options.ffmpegPath || 'ffmpeg';
    await this.runFFmpegWithProgress(
      ffmpegPath,
      ffmpegArgs,
      context,
      processId,
      inputMetadata.duration
    );
    
    return {
      type: operation.type,
      inputPath,
      outputPath,
      duration: Date.now() - startTime,
      config: operation.config
    };
  }
  
  private buildTranscodeArgs(
    inputPath: string,
    outputPath: string,
    config: any,
    metadata: VideoMetadata
  ): string[] {
    const args = ['-i', inputPath];
    
    // 视频编码器
    if (config.videoCodec) {
      args.push('-c:v', config.videoCodec);
    }
    
    // 音频编码器
    if (config.audioCodec) {
      args.push('-c:a', config.audioCodec);
    }
    
    // 分辨率
    if (config.resolution) {
      args.push('-s', config.resolution);
    }
    
    // 帧率
    if (config.fps) {
      args.push('-r', config.fps.toString());
    }
    
    // 比特率
    if (config.videoBitrate) {
      args.push('-b:v', config.videoBitrate);
    }
    
    if (config.audioBitrate) {
      args.push('-b:a', config.audioBitrate);
    }
    
    // 质量设置
    if (config.crf) {
      args.push('-crf', config.crf.toString());
    }
    
    args.push('-y', outputPath);
    return args;
  }
  
  private buildWatermarkArgs(inputPath: string, outputPath: string, config: any): string[] {
    const args = ['-i', inputPath];
    
    if (config.watermarkPath) {
      args.push('-i', config.watermarkPath);
      
      // 水印位置
      const position = config.position || 'bottom-right';
      let filterComplex = '';
      
      switch (position) {
        case 'top-left':
          filterComplex = '[1:v]scale=100:100[watermark];[0:v][watermark]overlay=10:10';
          break;
        case 'top-right':
          filterComplex = '[1:v]scale=100:100[watermark];[0:v][watermark]overlay=main_w-overlay_w-10:10';
          break;
        case 'bottom-left':
          filterComplex = '[1:v]scale=100:100[watermark];[0:v][watermark]overlay=10:main_h-overlay_h-10';
          break;
        case 'bottom-right':
          filterComplex = '[1:v]scale=100:100[watermark];[0:v][watermark]overlay=main_w-overlay_w-10:main_h-overlay_h-10';
          break;
        case 'center':
          filterComplex = '[1:v]scale=100:100[watermark];[0:v][watermark]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2';
          break;
      }
      
      args.push('-filter_complex', filterComplex);
    } else if (config.text) {
      // 文字水印
      const fontSize = config.fontSize || 24;
      const color = config.color || 'white';
      const position = config.position || 'bottom-right';
      
      let drawtext = `drawtext=text='${config.text}':fontsize=${fontSize}:fontcolor=${color}`;
      
      switch (position) {
        case 'top-left':
          drawtext += ':x=10:y=10';
          break;
        case 'top-right':
          drawtext += ':x=w-tw-10:y=10';
          break;
        case 'bottom-left':
          drawtext += ':x=10:y=h-th-10';
          break;
        case 'bottom-right':
          drawtext += ':x=w-tw-10:y=h-th-10';
          break;
        case 'center':
          drawtext += ':x=(w-tw)/2:y=(h-th)/2';
          break;
      }
      
      args.push('-vf', drawtext);
    }
    
    args.push('-y', outputPath);
    return args;
  }
  
  private buildTrimArgs(inputPath: string, outputPath: string, config: any): string[] {
    const args = ['-i', inputPath];
    
    if (config.startTime) {
      args.push('-ss', config.startTime);
    }
    
    if (config.duration) {
      args.push('-t', config.duration);
    } else if (config.endTime) {
      args.push('-to', config.endTime);
    }
    
    args.push('-c', 'copy', '-y', outputPath);
    return args;
  }
  
  private buildCompressArgs(
    inputPath: string,
    outputPath: string,
    config: any,
    metadata: VideoMetadata
  ): string[] {
    const args = ['-i', inputPath];
    
    // 根据压缩级别设置参数
    const compressionLevel = config.level || 'medium';
    
    switch (compressionLevel) {
      case 'light':
        args.push('-crf', '23', '-preset', 'medium');
        break;
      case 'medium':
        args.push('-crf', '28', '-preset', 'medium');
        break;
      case 'heavy':
        args.push('-crf', '32', '-preset', 'slow');
        break;
    }
    
    // 目标文件大小
    if (config.targetSize) {
      const targetBitrate = Math.floor((config.targetSize * 8 * 1024) / metadata.duration);
      args.push('-b:v', `${targetBitrate}k`);
    }
    
    args.push('-y', outputPath);
    return args;
  }
  
  private async extractFrames(
    inputPath: string,
    config: any,
    tempDir: string,
    context: ExecutionContext
  ): Promise<any> {
    const outputDir = `${tempDir}/frames_${Date.now()}`;
    await fs.mkdir(outputDir, { recursive: true });
    
    const args = ['-i', inputPath];
    
    // 提取间隔
    if (config.interval) {
      args.push('-vf', `fps=1/${config.interval}`);
    } else if (config.count) {
      args.push('-vf', `select='not(mod(n\\,${config.count}))'`);
    }
    
    // 输出格式
    const format = config.format || 'png';
    const outputPattern = `${outputDir}/frame_%04d.${format}`;
    
    args.push('-y', outputPattern);
    
    await this.runCommand('ffmpeg', args, context);
    
    // 获取生成的帧文件列表
    const frameFiles = await fs.readdir(outputDir);
    
    return {
      type: 'extract_frames',
      inputPath,
      outputPath: outputDir,
      frameCount: frameFiles.length,
      frameFiles: frameFiles.map(file => `${outputDir}/${file}`)
    };
  }
  
  private async runFFmpegWithProgress(
    ffmpegPath: string,
    args: string[],
    context: ExecutionContext,
    processId: string,
    totalDuration: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(ffmpegPath, args);
      this.activeProcesses.set(processId, process);
      
      let stderr = '';
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        
        // 解析FFmpeg进度信息
        const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (timeMatch) {
          const [, hours, minutes, seconds] = timeMatch;
          const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
          const progress = Math.min((currentTime / totalDuration) * 100, 100);
          
          context.progress(progress, `Processing... ${Math.round(progress)}%`);
        }
      });
      
      process.on('close', (code) => {
        this.activeProcesses.delete(processId);
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process failed with code ${code}. Error: ${stderr}`));
        }
      });
      
      process.on('error', (error) => {
        this.activeProcesses.delete(processId);
        reject(error);
      });
    });
  }
  
  private async getVideoMetadata(
    videoPath: string,
    options: VideoProcessingParams['options'],
    context: ExecutionContext
  ): Promise<VideoMetadata> {
    const ffprobePath = options.ffmpegPath?.replace('ffmpeg', 'ffprobe') || 'ffprobe';
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      videoPath
    ];
    
    const output = await this.runCommand(ffprobePath, args, context);
    const metadata = JSON.parse(output);
    
    const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
    const format = metadata.format;
    
    return {
      duration: parseFloat(format.duration),
      width: videoStream.width,
      height: videoStream.height,
      fps: eval(videoStream.r_frame_rate), // 计算帧率
      bitrate: parseInt(format.bit_rate),
      codec: videoStream.codec_name,
      fileSize: parseInt(format.size)
    };
  }
  
  private async runCommand(command: string, args: string[], context: ExecutionContext): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';
      
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}. Error: ${stderr}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  private async getFFmpegVersion(options: VideoProcessingParams['options']): Promise<string> {
    try {
      const ffmpegPath = options.ffmpegPath || 'ffmpeg';
      const output = await this.runCommand(ffmpegPath, ['-version'], {} as ExecutionContext);
      const versionMatch = output.match(/ffmpeg version ([^\s]+)/);
      return versionMatch ? versionMatch[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  private calculateQualityChange(input: VideoMetadata, output: VideoMetadata): number {
    // 简单的质量变化计算（基于分辨率和比特率）
    const inputQuality = input.width * input.height * input.bitrate;
    const outputQuality = output.width * output.height * output.bitrate;
    
    return (outputQuality / inputQuality) * 100;
  }
  
  protected async afterExecute(result: ProcessorResult, context: ExecutionContext): Promise<void> {
    await super.afterExecute(result, context);
    
    // 清理临时文件
    for (const tempFile of this.tempFiles) {
      try {
        await fs.unlink(tempFile);
        context.logger.debug(`Cleaned up temp file: ${tempFile}`);
      } catch (error) {
        context.logger.warn(`Failed to clean up temp file: ${tempFile}`, error);
      }
    }
    this.tempFiles.clear();
  }
  
  async cleanup(): Promise<void> {
    // 终止所有活跃进程
    for (const [processId, process] of this.activeProcesses) {
      process.kill('SIGTERM');
      console.log(`Terminated video processing: ${processId}`);
    }
    this.activeProcesses.clear();
    
    // 清理临时文件
    for (const tempFile of this.tempFiles) {
      try {
        await fs.unlink(tempFile);
      } catch {
        // 忽略清理错误
      }
    }
    this.tempFiles.clear();
  }
}

// 使用示例
export const videoProcessingExamples = {
  // 视频压缩示例
  compression: {
    name: '视频压缩处理',
    task_type: 'videoProcessing',
    task_config: {
      input: {
        source: '/input/large_video.mp4'
      },
      operations: [
        {
          type: 'compress',
          config: {
            level: 'medium',
            targetSize: 50 // MB
          }
        }
      ],
      output: {
        path: '/output/compressed_video.mp4',
        format: 'mp4',
        quality: 'medium'
      },
      options: {
        maxFileSize: 1000, // 1GB
        timeout: 3600 // 1小时
      }
    }
  },
  
  // 视频转码和水印示例
  transcodeWithWatermark: {
    name: '视频转码并添加水印',
    task_type: 'videoProcessing',
    task_config: {
      input: {
        source: '/input/source_video.avi'
      },
      operations: [
        {
          type: 'transcode',
          config: {
            videoCodec: 'libx264',
            audioCodec: 'aac',
            resolution: '1920x1080',
            fps: 30,
            crf: 23
          }
        },
        {
          type: 'add_watermark',
          config: {
            text: '© 2024 Company Name',
            position: 'bottom-right',
            fontSize: 24,
            color: 'white'
          }
        }
      ],
      output: {
        path: '/output/final_video.mp4',
        format: 'mp4',
        quality: 'high'
      }
    }
  }
};