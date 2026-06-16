import { getGoogleDriveImageUrl } from '../services/googleDrive';

type DriveImageProps = {
  fileIdOrUrl: string;
  alt: string;
  className?: string;
};

export function DriveImage({ fileIdOrUrl, alt, className }: DriveImageProps) {
  return <img src={getGoogleDriveImageUrl(fileIdOrUrl)} alt={alt} className={className} loading="lazy" />;
}
