import React from 'react';
import {
  SiJavascript,
  SiTypescript,
  SiPython,
  SiHtml5,
  SiCss3,
  SiReact,
  SiRust,
  SiGo,
  SiPhp,
  SiRuby,
  SiCplusplus,
  SiMysql,
  SiDocker,
  SiMarkdown,
  SiJson,
  SiYaml,
  SiGit,
  SiNodedotjs,
  SiKotlin,
  SiSwift,
  SiLua,
  SiPerl,
  SiR,
  SiScala,
} from 'react-icons/si';
import {
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileImage,
  FaFileAudio,
  FaFileVideo,
  FaFileArchive,
  FaFileCode,
  FaFileAlt,
  FaFile,
  FaJava,
  FaAndroid,
  FaApple,
  FaLinux,
  FaWindows
} from 'react-icons/fa';
import { VscFileBinary } from "react-icons/vsc";

interface FileIconProps {
  fileName: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const FileIcon: React.FC<FileIconProps> = ({ fileName, size = 16, className, style }) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const name = fileName.toLowerCase();

  const iconProps = { size, className, style };

  // Specific filenames
  if (name === 'dockerfile') return <SiDocker {...iconProps} color="#2496ED" />;
  if (name === 'makefile') return <FaFileCode {...iconProps} />;
  if (name === '.gitignore' || name === '.gitattributes') return <SiGit {...iconProps} color="#F05032" />;
  if (name === 'package.json') return <SiNodedotjs {...iconProps} color="#339933" />;
  if (name === 'readme.md') return <SiMarkdown {...iconProps} />;

  switch (ext) {
    // Code - Web
    case 'js':
    case 'mjs':
    case 'cjs':
      return <SiJavascript {...iconProps} color="#F7DF1E" />;
    case 'jsx':
      return <SiReact {...iconProps} color="#61DAFB" />;
    case 'ts':
      return <SiTypescript {...iconProps} color="#3178C6" />;
    case 'tsx':
      return <SiReact {...iconProps} color="#3178C6" />; // TSX is React + TS
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <SiCss3 {...iconProps} color="#1572B6" />;
    case 'html':
    case 'htm':
      return <SiHtml5 {...iconProps} color="#E34F26" />;
    case 'json':
      return <SiJson {...iconProps} color="#000000" />; // Or generic
    case 'xml':
    case 'svg': // SVG is code but also image, treat as code/image
      return <FaFileCode {...iconProps} color="#FF9900" />;

    // Code - Backend/System
    case 'py':
    case 'pyc':
    case 'pyd':
    case 'pyo':
    case 'pyw':
    case 'pyz':
      return <SiPython {...iconProps} color="#3776AB" />;
    case 'java':
    case 'jar':
    case 'class':
      return <FaJava {...iconProps} color="#007396" />;
    case 'c':
    case 'h':
      return <SiCplusplus {...iconProps} color="#00599C" />; // C/C++ often share icon
    case 'cpp':
    case 'hpp':
    case 'cc':
    case 'cxx':
      return <SiCplusplus {...iconProps} color="#00599C" />;
    case 'cs':
      return <FaFileCode {...iconProps} color="#239120" />;
    case 'go':
      return <SiGo {...iconProps} color="#00ADD8" />;
    case 'rs':
      return <SiRust {...iconProps} color="#000000" />;
    case 'php':
      return <SiPhp {...iconProps} color="#777BB4" />;
    case 'rb':
      return <SiRuby {...iconProps} color="#CC342D" />;
    case 'kt':
    case 'kts':
      return <SiKotlin {...iconProps} color="#7F52FF" />;
    case 'swift':
      return <SiSwift {...iconProps} color="#F05138" />;
    case 'scala':
      return <SiScala {...iconProps} color="#DC322F" />;
    case 'pl':
    case 'pm':
      return <SiPerl {...iconProps} color="#39457E" />;
    case 'lua':
      return <SiLua {...iconProps} color="#2C2D72" />;
    case 'r':
      return <SiR {...iconProps} color="#276DC3" />;
    
    // Shell/Scripts
    case 'sh':
    case 'bash':
    case 'zsh':
      return <FaTerminal {...iconProps} color="#4EAA25" />;
    case 'ps1':
    case 'psm1':
      return <FaWindows {...iconProps} color="#5391FE" />;
    case 'bat':
    case 'cmd':
      return <FaTerminal {...iconProps} />;

    // Config/Data
    case 'yaml':
    case 'yml':
      return <SiYaml {...iconProps} color="#CB171E" />;
    case 'toml':
    case 'ini':
    case 'conf':
    case 'config':
      return <FaFileCode {...iconProps} color="#666666" />;
    case 'env':
      return <FaFileCode {...iconProps} color="#666666" />;
    case 'sql':
      return <SiMysql {...iconProps} color="#4479A1" />;
    case 'md':
    case 'markdown':
      return <SiMarkdown {...iconProps} color="#000000" />;

    // Documents
    case 'pdf':
      return <FaFilePdf {...iconProps} color="#F40F02" />;
    case 'doc':
    case 'docx':
    case 'rtf':
      return <FaFileWord {...iconProps} color="#2B579A" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FaFileExcel {...iconProps} color="#217346" />;
    case 'ppt':
    case 'pptx':
      return <FaFilePowerpoint {...iconProps} color="#D24726" />;
    case 'txt':
    case 'log':
      return <FaFileAlt {...iconProps} color="#808080" />;

    // Images
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'ico':
    case 'tiff':
      return <FaFileImage {...iconProps} color="#B22222" />;

    // Media
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'aac':
      return <FaFileAudio {...iconProps} color="#1E90FF" />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'mkv':
    case 'webm':
      return <FaFileVideo {...iconProps} color="#FF4500" />;

    // Archives
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
    case 'xz':
      return <FaFileArchive {...iconProps} color="#DAA520" />;

    // Executables/System
    case 'exe':
    case 'msi':
    case 'dll':
      return <FaWindows {...iconProps} color="#0078D6" />;
    case 'dmg':
    case 'pkg':
      return <FaApple {...iconProps} color="#A6B5C5" />;
    case 'deb':
    case 'rpm':
      return <FaLinux {...iconProps} color="#FCC624" />;
    case 'bin':
    case 'iso':
    case 'img':
      return <VscFileBinary {...iconProps} color="#555555" />;

    default:
      return <FaFile {...iconProps} color="#A9A9A9" />;
  }
};

export default FileIcon;
