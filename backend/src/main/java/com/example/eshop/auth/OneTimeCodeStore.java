package com.example.eshop.auth;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Short-lived, single-use codes handed to the browser after a Google/Facebook login.
 * The Angular app trades the code for a JWT via {@code POST /api/auth/exchange}, so the JWT itself
 * never appears in a URL (where it could leak into browser history or server logs).
 *
 * <p>In-memory: fine for a single server instance. A cluster would need a shared store (e.g. Redis).
 */
@Component
public class OneTimeCodeStore {

    static final Duration TTL = Duration.ofSeconds(60);

    private record Entry(Long userId, Instant expiresAt) {}

    private final Map<String, Entry> codes = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;

    public OneTimeCodeStore() {
        this(Clock.systemUTC());
    }

    OneTimeCodeStore(Clock clock) {
        this.clock = clock;
    }

    public String issue(Long userId) {
        Instant now = clock.instant();
        codes.values().removeIf(e -> e.expiresAt().isBefore(now)); // drop stale codes
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        codes.put(code, new Entry(userId, now.plus(TTL)));
        return code;
    }

    /** Returns the user id for a valid code and invalidates it; empty if unknown, used or expired. */
    public Optional<Long> consume(String code) {
        Entry entry = codes.remove(code);
        if (entry == null || entry.expiresAt().isBefore(clock.instant())) {
            return Optional.empty();
        }
        return Optional.of(entry.userId());
    }
}
