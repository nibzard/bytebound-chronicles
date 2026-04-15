import { storyValidationService } from '../src/api/services';
import { storyMetadataService } from '../src/api/services';

async function validate() {
  const catalog = await storyMetadataService.getStoryCatalog(true);
  for (const story of catalog.stories) {
    const result = await storyValidationService.validateStory(story.id);
    if (result.valid) {
      console.log(`✅ Story "${story.title}" is valid`);
    } else {
      console.error(`❌ Story "${story.title}" is invalid:`);
      for (const issue of result.issues) {
        console.error(`  - ${issue.message}`);
      }
    }
  }
}

validate();
