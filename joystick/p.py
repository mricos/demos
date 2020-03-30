import simpleaudio as sa
import wave

wave_read = wave.open(path_to_file, 'rb')
audio_data = wave_read.readframes(wave_read.getnframes())
num_channels = wave_read.getnchannels()
bytes_per_sample = wave_read.getsampwidth()
sample_rate = wave_read.getframerate()

play_obj = sa.play_buffer(audio_data, num_channels, bytes_per_sample, sample_rate)
play_obj.wait_done()
