using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace MosqueOS.API.Services
{
    public static class FileValidationHelper
    {
        private static readonly Dictionary<string, List<byte[]>> ImageSignatures = new()
        {
            { ".jpeg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
            { ".jpg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
            { ".png", new List<byte[]> { new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A } } },
            { ".gif", new List<byte[]> { new byte[] { 0x47, 0x49, 0x46, 0x38 } } },
            { ".webp", new List<byte[]> { new byte[] { 0x52, 0x49, 0x46, 0x46 } } } // RIFF ... WEBP
        };

        public static bool IsValidImageSignature(Stream stream, string extension)
        {
            if (string.IsNullOrEmpty(extension)) return false;
            
            var ext = extension.ToLowerInvariant();
            if (!ImageSignatures.TryGetValue(ext, out var signatures))
                return false;

            stream.Position = 0;
            using var reader = new BinaryReader(stream, System.Text.Encoding.UTF8, leaveOpen: true);
            var headerBytes = reader.ReadBytes(8);
            stream.Position = 0;

            if (ext == ".webp")
            {
                // WebP signature is "RIFF" (4 bytes) + file size (4 bytes) + "WEBP" (4 bytes)
                if (headerBytes.Length < 4 || !headerBytes.Take(4).SequenceEqual(signatures[0]))
                    return false;
                    
                stream.Position = 8;
                var webpHeader = reader.ReadBytes(4);
                stream.Position = 0;
                return webpHeader.SequenceEqual(new byte[] { 0x57, 0x45, 0x42, 0x50 }); // "WEBP"
            }

            return signatures.Any(signature => 
                headerBytes.Take(signature.Length).SequenceEqual(signature));
        }
    }
}
