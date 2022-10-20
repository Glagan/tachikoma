# Kitsu

## Rating

``ratingTwenty``, which range from ``0`` to ``20`` (included)

## Library Entry

A ``libraryEntryId`` is required while updating and deleting a library entry, but it's not stored, since to update a title it need to be fetched first, and the ID can be stored in memory.  
On deletion, if the title wasn't fetched for some reasons, it should try to fetch it to get an ID before failing or deleting the title on **Kitsu**.

## Max chapter

If the progress of a library entry is set to a chapter above the last chapter on **Kitsu**, a ``422 Cannot exceed media length`` error is returned.
