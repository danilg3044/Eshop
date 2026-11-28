package com.example.eshop.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Serves the built Angular app from a folder on disk at {@code /eshop/} ({@code eshop.frontend-dir}, env
 * {@code FRONTEND_DIR}; build it with {@code npm run build:backend}, which sets {@code <base href="/eshop/">}).
 * <ul>
 *   <li>Existing files (bundles, fonts, favicon) are returned as they are.</li>
 *   <li>Any other path under /eshop/ gets index.html, so deep links and reloads (/eshop/admin/orders,
 *       /eshop/auth/callback?code=...) start the app and the Angular router takes over.</li>
 *   <li>The folder is read on every request, so a new {@code ng build} shows up without restarting.</li>
 * </ul>
 * If the folder does not exist nothing is registered and the backend is API-only, as before.
 */
@Configuration
public class FrontendConfig implements WebMvcConfigurer {

    public static final String PATH = "/eshop/";

    private static final Logger log = LoggerFactory.getLogger(FrontendConfig.class);

    private final Path dir;

    public FrontendConfig(EshopProperties props) {
        Path candidate = props.frontendDir() == null || props.frontendDir().isBlank()
                ? null : Path.of(props.frontendDir()).toAbsolutePath().normalize();
        if (candidate != null && Files.isRegularFile(candidate.resolve("index.html"))) {
            dir = candidate;
            log.info("Serving the Angular app from {} at {}", dir, PATH);
        } else {
            dir = null;
            log.info("Not serving the Angular app: no index.html in {} (build it with 'npm run build:backend' "
                    + "or set FRONTEND_DIR)", candidate);
        }
    }

    public boolean enabled() {
        return dir != null;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if (!enabled()) {
            return;
        }
        registry.addResourceHandler(PATH + "**")
                .addResourceLocations(new FileSystemResource(dir.toString() + "/"))
                // The browser re-validates every file (cheap 304s via Last-Modified), so a new build is picked up
                // at once. Production would cache the content-hashed bundles for long and only index.html briefly.
                .setCacheControl(CacheControl.noCache())
                .resourceChain(false)
                .addResolver(new SpaResolver());
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        if (!enabled()) {
            return;
        }
        registry.addRedirectViewController("/", PATH);
        registry.addRedirectViewController("/eshop", PATH);
        // The resource handler ignores an empty path, so the app's root is forwarded to its index.html explicitly.
        registry.addViewController(PATH).setViewName("forward:" + PATH + "index.html");
    }

    /** A file if there is one, otherwise index.html (the app's own routes). */
    private static final class SpaResolver extends PathResourceResolver {

        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            Resource file = super.getResource(resourcePath, location);
            if (file != null) {
                return file;
            }
            // A missing file with an extension (e.g. an old bundle name) is a real 404, not an app route.
            if (resourcePath.substring(resourcePath.lastIndexOf('/') + 1).contains(".")) {
                return null;
            }
            Resource index = location.createRelative("index.html");
            return index.isReadable() ? index : null;
        }
    }
}
