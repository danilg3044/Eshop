package com.example.eshop.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class OneTimeCodeStoreTest {

    /** A clock the test can move forward. */
    static class MutableClock extends Clock {
        final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-01-01T10:00:00Z"));
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now.get(); }
    }

    MutableClock clock = new MutableClock();
    OneTimeCodeStore store = new OneTimeCodeStore(clock);

    @Test
    void codeCanBeUsedOnlyOnce() {
        String code = store.issue(42L);

        assertThat(store.consume(code)).contains(42L);
        assertThat(store.consume(code)).isEmpty();
    }

    @Test
    void expiredCodeIsRejected() {
        String code = store.issue(42L);
        clock.now.set(clock.now.get().plus(OneTimeCodeStore.TTL).plusSeconds(1));

        assertThat(store.consume(code)).isEmpty();
    }

    @Test
    void codesAreUniqueAndUrlSafe() {
        String a = store.issue(1L);
        String b = store.issue(1L);

        assertThat(a).isNotEqualTo(b).matches("[A-Za-z0-9_-]{43}");
    }

    @Test
    void unknownCodeIsRejected() {
        assertThat(store.consume("nope")).isEmpty();
    }
}
