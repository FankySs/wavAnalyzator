import { Component, Signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AudioFileService } from '../../services/audio-file.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
})
export class HomePageComponent {
  private readonly audioFileService = inject(AudioFileService);
  protected readonly file: Signal<File | null> = this.audioFileService.file;
}
