import UIKit
import FirebaseStorage

/// Crops a photo to a centered square, shrinks it to 512×512 and compresses it
/// to a JPEG under ~300 KB before uploading to `users/{uid}/avatar.jpg`.
/// `storage.rules` only accepts JPEGs under 1 MB at exactly that path.
enum AvatarUploader {
    static let side: CGFloat = 512
    static let targetBytes = 300 * 1024

    enum Failure: LocalizedError {
        case unreadable, tooLarge
        var errorDescription: String? {
            switch self {
            case .unreadable: "That photo couldn't be read. Try another."
            case .tooLarge: "That photo is too detailed to shrink. Try another."
            }
        }
    }

    /// Returns the square, resized, compressed JPEG data.
    static func prepare(_ image: UIImage) throws -> Data {
        let square = cropSquare(image)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1 // exact pixel size, not points × screen scale
        format.opaque = true
        let resized = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format).image { _ in
            square.draw(in: CGRect(x: 0, y: 0, width: side, height: side))
        }
        for quality in [0.8, 0.7, 0.6, 0.5, 0.4] as [CGFloat] {
            if let data = resized.jpegData(compressionQuality: quality), data.count <= targetBytes {
                return data
            }
        }
        guard let last = resized.jpegData(compressionQuality: 0.3), last.count < 1_000_000 else { throw Failure.tooLarge }
        return last
    }

    /// Uploads and returns the download URL to store as `photoURL`.
    static func upload(_ jpeg: Data, uid: String) async throws -> URL {
        let ref = Storage.storage().reference(withPath: "users/\(uid)/avatar.jpg")
        let metadata = StorageMetadata()
        metadata.contentType = "image/jpeg"
        metadata.cacheControl = "public, max-age=86400"
        _ = try await ref.putDataAsync(jpeg, metadata: metadata)
        // Same path on every upload, so add a version to bust image caches.
        let url = try await ref.downloadURL()
        var parts = URLComponents(url: url, resolvingAgainstBaseURL: false)
        parts?.queryItems = (parts?.queryItems ?? []) + [URLQueryItem(name: "v", value: String(Int(Date().timeIntervalSince1970)))]
        return parts?.url ?? url
    }

    private static func cropSquare(_ image: UIImage) -> UIImage {
        // Draw once to bake in the orientation (photos are often rotated via EXIF).
        let upright = UIGraphicsImageRenderer(size: image.size).image { _ in image.draw(at: .zero) }
        guard let cg = upright.cgImage else { return upright }
        let w = CGFloat(cg.width), h = CGFloat(cg.height)
        let edge = min(w, h)
        let rect = CGRect(x: (w - edge) / 2, y: (h - edge) / 2, width: edge, height: edge)
        guard let cropped = cg.cropping(to: rect) else { return upright }
        return UIImage(cgImage: cropped)
    }
}
