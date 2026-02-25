import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class ImageHandler {
    static importImage(gioFile) {
        try {
            // Determine data directory
            const dataDir = GLib.get_user_data_dir();
            const imageDir = GLib.build_filenamev([dataDir, 'villepreux', 'images']);

            // Ensure directory exists
            const dirFile = Gio.File.new_for_path(imageDir);
            if (!dirFile.query_exists(null)) {
                dirFile.make_directory_with_parents(null);
            }

            // Load image via GdkPixbuf
            const pixbuf = GdkPixbuf.Pixbuf.new_from_file(gioFile.get_path());
            let finalPixbuf = pixbuf;

            // Scale down if > 1920
            const MAX_DIMENSION = 1920;
            let origWidth = pixbuf.get_width();
            let origHeight = pixbuf.get_height();

            if (origWidth > MAX_DIMENSION || origHeight > MAX_DIMENSION) {
                let newWidth, newHeight;
                if (origWidth > origHeight) {
                    newWidth = MAX_DIMENSION;
                    newHeight = Math.floor(origHeight * (MAX_DIMENSION / origWidth));
                } else {
                    newHeight = MAX_DIMENSION;
                    newWidth = Math.floor(origWidth * (MAX_DIMENSION / origHeight));
                }
                console.log(`[ImageHandler] Scaling image from ${origWidth}x${origHeight} to ${newWidth}x${newHeight}`);
                finalPixbuf = pixbuf.scale_simple(newWidth, newHeight, GdkPixbuf.InterpType.BILINEAR);
            }

            // Generate unique filename
            const uuid = GLib.uuid_string_random();
            const filename = `${uuid}.jpg`;
            const finalPath = GLib.build_filenamev([imageDir, filename]);

            // Save it
            finalPixbuf.savev(finalPath, 'jpeg', ['quality'], ['85']);
            console.log(`[ImageHandler] Image saved successfully to: ${finalPath}`);

            return filename;
        } catch (e) {
            console.error(`[ImageHandler] Failed to import image:`, e);
            throw e;
        }
    }

    static getImagePath(filename) {
        if (!filename) return null;
        const dataDir = GLib.get_user_data_dir();
        return GLib.build_filenamev([dataDir, 'villepreux', 'images', filename]);
    }
}
